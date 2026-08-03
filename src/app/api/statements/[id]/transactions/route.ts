import { NextResponse } from 'next/server';
import { appUserIdForAuth, notifyUser } from '@/lib/platform/notifications';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { sanitizeLog } from '@/lib/platform/auth';
import { transactionSchema } from '@/lib/platform/schemas';
import { detectLoanRecords, detectSalaryRecords, extractContacts, extractUpiIds, normalizeTransaction, summarizeTransactions } from '@/lib/platform/statement-engine';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'statements.process', 'statement_transactions.ingest');
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = transactionSchema.array().parse(body.transactions ?? []);
    const normalized = parsed.map(normalizeTransaction);
    const rows = normalized.map((transaction) => ({
      statement_id: id,
      transaction_date: transaction.transaction_date.toISOString().slice(0, 10),
      value_date: transaction.value_date?.toISOString().slice(0, 10),
      narration: transaction.narration,
      reference_number: transaction.reference_number,
      transaction_type: transaction.transaction_type,
      credit: transaction.credit,
      debit: transaction.debit,
      balance: transaction.balance,
      raw_data: transaction.raw_data,
      normalized_hash: transaction.normalized_hash,
      category: transaction.category,
      category_confidence: transaction.category_confidence,
    }));

    const { data: inserted, error: insertError } = await auth.supabase
      .from('statement_transactions')
      .upsert(rows, { onConflict: 'statement_id,normalized_hash' })
      .select('id,narration,transaction_date,credit,debit,balance,category,category_confidence');
    if (insertError) throw insertError;

    const summary = summarizeTransactions(normalized);
    const { error: analysisError } = await auth.supabase
      .from('statement_analysis')
      .upsert({ statement_id: id, ...summary, analysis: { generated_from: 'api' } }, { onConflict: 'statement_id' });
    if (analysisError) throw analysisError;

    const { data: statement } = await auth.supabase.from('bank_statements').select('customer_id').eq('id', id).single();
    if (statement?.customer_id) {
      const contacts = extractContacts(inserted ?? []);
      const upis = extractUpiIds(inserted ?? []);
      const salaryRecords = detectSalaryRecords(statement.customer_id, id, normalized);
      const { data: lenderKeywordRows } = await auth.supabase
        .from('lender_keywords')
        .select('lender_id, keyword, weight, lender_master!inner(name)');
      const keywordRows = (lenderKeywordRows ?? []) as Array<{
        lender_id: string;
        keyword: string;
        weight: number | string | null;
        lender_master: { name: string } | Array<{ name: string }> | null;
      }>;
      const loanRecords = detectLoanRecords(
        statement.customer_id,
        id,
        normalized,
        keywordRows.reduce<Array<{ lender_id: string; lender_name: string; keyword: string; weight: number }>>((items, row) => {
          const lenderName = Array.isArray(row.lender_master) ? row.lender_master[0]?.name : row.lender_master?.name;
          if (!lenderName) return items;
          items.push({
            lender_id: row.lender_id,
            lender_name: lenderName,
            keyword: row.keyword,
            weight: Number(row.weight ?? 1),
          });
          return items;
        }, []),
      );

      if (salaryRecords.length) {
        await auth.supabase.from('salary_records').insert(salaryRecords);
      }
      if (loanRecords.length) {
        await auth.supabase.from('loan_records').insert(loanRecords);
      }
      if (contacts.length) {
        await auth.supabase.from('contact_numbers').upsert(
          contacts.map((item) => ({ ...item, customer_id: statement.customer_id, statement_id: id })),
          { onConflict: 'customer_id,number' },
        );
      }
      if (upis.length) {
        await auth.supabase.from('upi_ids').upsert(
          upis.map((item) => ({ ...item, customer_id: statement.customer_id, statement_id: id })),
          { onConflict: 'customer_id,upi' },
        );
      }
    }
    const appUserId = await appUserIdForAuth(auth.supabase, auth.authUser.id);
    await notifyUser(auth.supabase, appUserId, 'Analysis completed', 'Statement transactions were ingested and analyzed.', 'success', {
      statement_id: id,
      transaction_count: inserted?.length ?? 0,
    });
    await logAudit(auth.supabase, auth.authUser, request, 'statement_transactions.ingest', 'bank_statements', id, undefined, {
      transaction_count: inserted?.length ?? 0,
      risk_score: summary.risk_score,
    });

    return NextResponse.json({ inserted: inserted?.length ?? 0, analysis: summary });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Transaction ingestion failed' }, { status: 400 });
  }
}
