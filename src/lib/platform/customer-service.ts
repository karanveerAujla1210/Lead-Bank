import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { customerInputSchema } from './schemas';
import { encryptField } from './crypto';

type CustomerInput = z.infer<typeof customerInputSchema>;

export function panHash(pan?: string) {
  if (!pan) return null;
  return crypto.createHash('sha256').update(pan.trim().toUpperCase()).digest('hex');
}

export async function createOrMergeCustomer(supabase: SupabaseClient, input: CustomerInput) {
  const normalizedMobile = input.primary_mobile?.replace(/\D/g, '').slice(-10);
  const normalizedPanHash = panHash(input.pan);

  let query = supabase.from('customers').select('*').is('deleted_at', null).limit(1);
  if (normalizedPanHash) {
    query = query.eq('pan_hash', normalizedPanHash);
  } else if (normalizedMobile) {
    query = query.eq('primary_mobile', normalizedMobile);
  } else if (input.primary_email) {
    query = query.eq('primary_email', input.primary_email.toLowerCase());
  }

  const { data: existing, error: findError } = await query.maybeSingle();
  if (findError) throw findError;

  const payload = {
    full_name: input.full_name,
    pan_hash: normalizedPanHash,
    pan_encrypted: encryptField(input.pan),
    primary_mobile: normalizedMobile,
    primary_email: input.primary_email?.toLowerCase(),
    city: input.city,
    source: input.source,
    metadata: input.metadata,
  };

  if (existing) {
    const { data, error } = await supabase
      .from('customers')
      .update({ ...payload, duplicate_score: 100 })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return { customer: data, merged: true };
  }

  const { data, error } = await supabase.from('customers').insert(payload).select().single();
  if (error) throw error;
  return { customer: data, merged: false };
}
