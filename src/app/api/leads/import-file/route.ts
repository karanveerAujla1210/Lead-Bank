import { NextResponse } from 'next/server';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { importLeads } from '@/lib/lead-service';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { sanitizeLog } from '@/lib/platform/auth';
import type { LeadInput } from '@/lib/types';

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await guardRequest(request, 'leads.write', 'leads.import_file');
  if ('error' in auth) return auth.error;

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) return NextResponse.json({ error: 'Only CSV/XLS/XLSX files are allowed' }, { status: 400 });

    const rows = await parseImportFile(file);
    const valid: LeadInput[] = [];
    let invalid = 0;
    const seen = new Set<string>();

    for (const row of rows) {
      const lead = normalizeRow(row);
      const mobile = lead.mobile.replace(/\D/g, '').replace(/^91/, '').slice(-10);
      if (!lead.customer_name || mobile.length !== 10) {
        invalid += 1;
        continue;
      }
      const key = `${lead.customer_name.toLowerCase()}-${mobile}`;
      if (seen.has(key)) {
        invalid += 1;
        continue;
      }
      seen.add(key);
      valid.push({ ...lead, mobile });
    }

    const inserted = await importLeads(valid);
    await logAudit(auth.supabase, auth.authUser, request, 'leads.import_file', 'lead_bank', undefined, undefined, {
      inserted: inserted.length,
      invalid,
    });
    return NextResponse.json({ inserted: inserted.length, invalid, duplicates: 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Import failed' }, { status: 400 });
  }
}

async function parseImportFile(file: File) {
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
  }

  return Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true }).data;
}

function normalizeRow(row: Record<string, string>): LeadInput {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim().toLowerCase().replace(/\s+/g, '_'), String(value ?? '').trim()]),
  );
  return {
    customer_name: normalized.customer_name || normalized.name || normalized.full_name || '',
    mobile: normalized.mobile || normalized.phone || normalized.contact_number || '',
    source: normalized.source || normalized.lead_source || 'import',
    city: normalized.city || normalized.location || '',
    remarks: normalized.remarks || normalized.notes || '',
  };
}
