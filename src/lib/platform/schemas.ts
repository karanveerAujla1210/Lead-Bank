import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
  search: z.string().trim().max(120).optional(),
  sort: z.string().trim().max(64).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const customerInputSchema = z.object({
  full_name: z.string().trim().min(2).max(160),
  pan: z.string().trim().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i).optional(),
  primary_mobile: z.string().trim().regex(/^(?:\+?91)?[6-9]\d{9}$/).optional(),
  primary_email: z.string().trim().email().optional(),
  city: z.string().trim().max(120).optional(),
  source: z.enum(['website', 'api', 'lead', 'manual', 'excel_import']).default('manual'),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const statementUploadSchema = z.object({
  customer_id: uuidSchema,
  bank_name: z.string().trim().max(120).optional(),
  account_number: z.string().trim().max(64).optional(),
  password: z.string().max(128).optional(),
  statement_period_start: z.coerce.date().optional(),
  statement_period_end: z.coerce.date().optional(),
});

export const transactionSchema = z.object({
  transaction_date: z.coerce.date(),
  value_date: z.coerce.date().optional(),
  narration: z.string().trim().min(1),
  reference_number: z.string().trim().optional(),
  transaction_type: z.string().trim().optional(),
  credit: z.coerce.number().nonnegative().default(0),
  debit: z.coerce.number().nonnegative().default(0),
  balance: z.coerce.number().optional(),
  raw_data: z.record(z.string(), z.unknown()).default({}),
});

export const allowedStatementMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

export const maxStatementFileBytes = 50 * 1024 * 1024;
