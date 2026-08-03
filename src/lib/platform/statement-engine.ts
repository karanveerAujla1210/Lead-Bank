import crypto from 'node:crypto';

import type { z } from 'zod';
import type { transactionSchema } from './schemas';

export type ParsedTransaction = z.infer<typeof transactionSchema>;

export type ClassifiedTransaction = ParsedTransaction & {
  normalized_hash: string;
  category: TransactionCategory;
  category_confidence: number;
};

export type TransactionCategory =
  | 'salary'
  | 'loan_emi'
  | 'cash_deposit'
  | 'cash_withdrawal'
  | 'atm'
  | 'upi'
  | 'imps'
  | 'neft'
  | 'rtgs'
  | 'cheque'
  | 'interest'
  | 'charges'
  | 'refund'
  | 'insurance'
  | 'investment'
  | 'subscription'
  | 'utilities'
  | 'shopping'
  | 'transfer'
  | 'others'
  | 'unknown';

const categoryRules: Array<{ category: TransactionCategory; confidence: number; patterns: RegExp[] }> = [
  { category: 'salary', confidence: 88, patterns: [/salary/i, /payroll/i, /wages/i] },
  { category: 'loan_emi', confidence: 86, patterns: [/\bemi\b/i, /loan/i, /nach/i, /ecs/i] },
  { category: 'cash_deposit', confidence: 84, patterns: [/cash\s*deposit/i, /\bcash dep\b/i] },
  { category: 'cash_withdrawal', confidence: 84, patterns: [/cash\s*withdraw/i, /\bcash wdl\b/i] },
  { category: 'atm', confidence: 82, patterns: [/\batm\b/i] },
  { category: 'upi', confidence: 92, patterns: [/\bupi\b/i, /@[a-z][a-z0-9.-]+/i] },
  { category: 'imps', confidence: 90, patterns: [/\bimps\b/i] },
  { category: 'neft', confidence: 90, patterns: [/\bneft\b/i] },
  { category: 'rtgs', confidence: 90, patterns: [/\brtgs\b/i] },
  { category: 'cheque', confidence: 82, patterns: [/cheque/i, /\bchq\b/i] },
  { category: 'interest', confidence: 80, patterns: [/interest/i] },
  { category: 'charges', confidence: 82, patterns: [/charge/i, /fee/i, /bounce/i, /penalty/i] },
  { category: 'refund', confidence: 82, patterns: [/refund/i, /reversal/i] },
  { category: 'insurance', confidence: 78, patterns: [/insurance/i, /\blic\b/i] },
  { category: 'investment', confidence: 76, patterns: [/mutual fund/i, /\bsip\b/i, /zerodha/i, /groww/i] },
  { category: 'subscription', confidence: 74, patterns: [/netflix/i, /spotify/i, /subscription/i] },
  { category: 'utilities', confidence: 74, patterns: [/electricity/i, /broadband/i, /mobile bill/i, /utility/i] },
  { category: 'shopping', confidence: 70, patterns: [/amazon/i, /flipkart/i, /myntra/i, /shopping/i] },
  { category: 'transfer', confidence: 68, patterns: [/transfer/i, /trf/i] },
];

export function normalizeTransaction(transaction: ParsedTransaction): ClassifiedTransaction {
  const narration = transaction.narration.replace(/\s+/g, ' ').trim();
  const match = categoryRules.find((rule) => rule.patterns.some((pattern) => pattern.test(narration)));
  const hashInput = [
    transaction.transaction_date.toISOString().slice(0, 10),
    narration.toUpperCase(),
    transaction.credit.toFixed(2),
    transaction.debit.toFixed(2),
    transaction.balance?.toFixed(2) ?? '',
  ].join('|');

  return {
    ...transaction,
    narration,
    normalized_hash: crypto.createHash('sha256').update(hashInput).digest('hex'),
    category: match?.category ?? 'unknown',
    category_confidence: match?.confidence ?? 20,
  };
}

export function extractContacts(transactions: Array<{ id?: string; narration: string }>) {
  const map = new Map<string, { number: string; occurrence_count: number; transaction_ids: string[] }>();
  for (const transaction of transactions) {
    for (const match of transaction.narration.matchAll(/(?:\+?91[-\s]?)?([6-9]\d{9})\b/g)) {
      const number = match[1];
      const entry = map.get(number) ?? { number, occurrence_count: 0, transaction_ids: [] };
      entry.occurrence_count += 1;
      if (transaction.id) entry.transaction_ids.push(transaction.id);
      map.set(number, entry);
    }
  }
  return [...map.values()];
}

export function extractUpiIds(transactions: Array<{ id?: string; narration: string }>) {
  const map = new Map<string, { upi: string; occurrence_count: number; transaction_ids: string[] }>();
  for (const transaction of transactions) {
    for (const match of transaction.narration.matchAll(/[a-z0-9._-]{2,256}@[a-z][a-z0-9.-]{2,64}/gi)) {
      const upi = match[0].toLowerCase();
      const entry = map.get(upi) ?? { upi, occurrence_count: 0, transaction_ids: [] };
      entry.occurrence_count += 1;
      if (transaction.id) entry.transaction_ids.push(transaction.id);
      map.set(upi, entry);
    }
  }
  return [...map.values()];
}

export function summarizeTransactions(transactions: ClassifiedTransaction[]) {
  const balances = transactions.map((item) => item.balance).filter((item): item is number => typeof item === 'number');
  const credits = transactions.map((item) => item.credit);
  const debits = transactions.map((item) => item.debit);
  const monthly_credits: Record<string, number> = {};
  const monthly_debits: Record<string, number> = {};

  for (const transaction of transactions) {
    const month = transaction.transaction_date.toISOString().slice(0, 7);
    monthly_credits[month] = (monthly_credits[month] ?? 0) + transaction.credit;
    monthly_debits[month] = (monthly_debits[month] ?? 0) + transaction.debit;
  }

  return {
    opening_balance: balances.at(0) ?? null,
    closing_balance: balances.at(-1) ?? null,
    average_balance: balances.length ? balances.reduce((sum, value) => sum + value, 0) / balances.length : null,
    highest_credit: Math.max(0, ...credits),
    highest_debit: Math.max(0, ...debits),
    minimum_balance: balances.length ? Math.min(...balances) : null,
    maximum_balance: balances.length ? Math.max(...balances) : null,
    cash_deposits: sumCategory(transactions, 'cash_deposit', 'credit'),
    cash_withdrawals: sumCategory(transactions, 'cash_withdrawal', 'debit'),
    salary_total: sumCategory(transactions, 'salary', 'credit'),
    emi_total: sumCategory(transactions, 'loan_emi', 'debit'),
    loan_count: transactions.filter((item) => item.category === 'loan_emi').length,
    bounce_charges: transactions.filter((item) => /bounce/i.test(item.narration)).reduce((sum, item) => sum + item.debit, 0),
    monthly_credits,
    monthly_debits,
    risk_score: calculateRiskScore(transactions),
  };
}

export function detectSalaryRecords(customerId: string, statementId: string, transactions: ClassifiedTransaction[]) {
  const salaryCredits = transactions
    .filter((item) => item.category === 'salary' && item.credit > 0)
    .sort((a, b) => a.transaction_date.getTime() - b.transaction_date.getTime());

  const groups = new Map<string, ClassifiedTransaction[]>();
  for (const transaction of salaryCredits) {
    const employer = inferEmployer(transaction.narration);
    groups.set(employer, [...(groups.get(employer) ?? []), transaction]);
  }

  return [...groups.entries()].map(([employer, items]) => {
    const average = items.reduce((sum, item) => sum + item.credit, 0) / items.length;
    const consistency = items.length >= 3 ? 95 : items.length === 2 ? 80 : 62;
    const amountVariance = Math.max(...items.map((item) => Math.abs(item.credit - average)));
    const amountConfidence = average > 0 ? Math.max(0, 100 - (amountVariance / average) * 100) : 0;
    const latest = items.at(-1)!;

    return {
      customer_id: customerId,
      statement_id: statementId,
      employer,
      salary_amount: Number(average.toFixed(2)),
      salary_date: latest.transaction_date.toISOString().slice(0, 10),
      confidence: Number(((consistency + amountConfidence) / 2).toFixed(2)),
      evidence: {
        transaction_count: items.length,
        transaction_hashes: items.map((item) => item.normalized_hash),
      },
    };
  });
}

export function detectLoanRecords(
  customerId: string,
  statementId: string,
  transactions: ClassifiedTransaction[],
  lenderKeywords: Array<{ lender_id: string; lender_name: string; keyword: string; weight: number }>,
) {
  const loanDebits = transactions.filter((item) => item.category === 'loan_emi' && item.debit > 0);
  const groups = new Map<string, { lender_id?: string; lender_name: string; items: ClassifiedTransaction[]; score: number }>();

  for (const transaction of loanDebits) {
    const match = lenderKeywords.find((item) => transaction.narration.toUpperCase().includes(item.keyword.toUpperCase()));
    const key = match?.lender_id ?? `unknown:${inferEmployer(transaction.narration)}`;
    const current = groups.get(key) ?? {
      lender_id: match?.lender_id,
      lender_name: match?.lender_name ?? inferEmployer(transaction.narration),
      items: [],
      score: 55,
    };
    current.items.push(transaction);
    current.score = Math.max(current.score, match ? 78 + Number(match.weight) * 5 : 55);
    groups.set(key, current);
  }

  return [...groups.values()].map((group) => {
    const average = group.items.reduce((sum, item) => sum + item.debit, 0) / group.items.length;
    const frequency = group.items.length >= 2 ? 'monthly' : 'unknown';
    const confidence = Math.min(99, group.score + Math.min(12, group.items.length * 4));

    return {
      customer_id: customerId,
      statement_id: statementId,
      lender_id: group.lender_id,
      lender_name: group.lender_name,
      emi_amount: Number(average.toFixed(2)),
      frequency,
      estimated_active_loan: group.items.at(-1)!.transaction_date > new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      confidence,
      evidence: {
        transaction_count: group.items.length,
        transaction_hashes: group.items.map((item) => item.normalized_hash),
      },
    };
  });
}

function sumCategory(transactions: ClassifiedTransaction[], category: TransactionCategory, side: 'credit' | 'debit') {
  return transactions.filter((item) => item.category === category).reduce((sum, item) => sum + item[side], 0);
}

function calculateRiskScore(transactions: ClassifiedTransaction[]) {
  const bounceCount = transactions.filter((item) => /bounce|return|failed/i.test(item.narration)).length;
  const emiTotal = sumCategory(transactions, 'loan_emi', 'debit');
  const salaryTotal = sumCategory(transactions, 'salary', 'credit');
  const emiBurden = salaryTotal > 0 ? Math.min(40, (emiTotal / salaryTotal) * 40) : 20;
  return Math.min(100, Math.round(emiBurden + bounceCount * 8));
}

function inferEmployer(narration: string) {
  return narration
    .replace(/\b(salary|payroll|wages|emi|loan|nach|ecs|upi|neft|imps|rtgs)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'Unknown';
}
