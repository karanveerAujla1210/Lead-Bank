import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Lead, LeadInput, LeadStats } from '@/lib/types';

const PAGE_SIZE = 10;

const defaultStats: LeadStats = {
  totalLeads: 0,
  todaysLeads: 0,
  duplicateLeads: 0,
  latestUpload: 'No leads yet',
};

function sanitizeMobile(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/^91/, '')
    .slice(-10);
}

function normalizeLeadPayload(input: LeadInput) {
  return {
    customer_name: input.customer_name.trim(),
    mobile: sanitizeMobile(input.mobile),
    source: input.source.trim(),
    city: input.city.trim(),
    remarks: input.remarks.trim(),
  };
}

export async function getLeadStats() {
  try {
    const supabase = await createServerSupabaseClient();
    const { count: totalCount, error: totalError } = await supabase
      .from('lead_bank')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null);

    if (totalError) throw totalError;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayCount, error: todayError } = await supabase
      .from('lead_bank')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', today.toISOString());

    if (todayError) throw todayError;

    const { data: duplicateData, error: duplicateError } = await supabase
      .from('lead_bank')
      .select('mobile')
      .is('deleted_at', null);

    if (duplicateError) throw duplicateError;

    const seen = new Set<string>();
    let duplicates = 0;
    duplicateData?.forEach((record) => {
      const normalized = record.mobile?.toLowerCase();
      if (normalized && seen.has(normalized)) {
        duplicates += 1;
      } else if (normalized) {
        seen.add(normalized);
      }
    });

    const { data: latestData, error: latestError } = await supabase
      .from('lead_bank')
      .select('created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (latestError && latestError.code !== 'PGRST116') throw latestError;

    return {
      totalLeads: totalCount ?? 0,
      todaysLeads: todayCount ?? 0,
      duplicateLeads: duplicates,
      latestUpload: latestData?.created_at ? new Date(latestData.created_at).toLocaleDateString() : 'No leads yet',
    } satisfies LeadStats;
  } catch {
    return defaultStats;
  }
}

export async function getLeads(params: {
  page: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  source?: string;
  city?: string;
}) {
  try {
    const supabase = await createServerSupabaseClient();
    const from = (params.page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from('lead_bank')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .range(from, to);

    if (params.search) {
      const value = params.search.trim();
      query = query.or(`customer_name.ilike.%${value}%,mobile.ilike.%${value}%`);
    }

    if (params.source) {
      query = query.eq('source', params.source);
    }

    if (params.city) {
      query = query.eq('city', params.city);
    }

    const sortColumn = params.sort ?? 'created_at';
    const sortOrder = params.order ?? 'desc';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: (data ?? []) as Lead[],
      count: count ?? 0,
      pageSize: PAGE_SIZE,
    };
  } catch {
    return {
      data: [] as Lead[],
      count: 0,
      pageSize: PAGE_SIZE,
    };
  }
}

export async function createLead(input: LeadInput) {
  const supabase = await createServerSupabaseClient();
  const payload = normalizeLeadPayload(input);
  const { data, error } = await supabase
    .from('lead_bank')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Lead;
}

export async function updateLead(id: string, input: LeadInput) {
  const supabase = await createServerSupabaseClient();
  const payload = normalizeLeadPayload(input);
  const { data, error } = await supabase
    .from('lead_bank')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Lead;
}

export async function deleteLead(id: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('lead_bank')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function importLeads(records: LeadInput[]) {
  const supabase = await createServerSupabaseClient();
  const payload = records.map((record) => normalizeLeadPayload(record));

  if (payload.length === 0) {
    return [] as Lead[];
  }

  const batchSize = 200;
  const inserted: Lead[] = [];

  for (let index = 0; index < payload.length; index += batchSize) {
    const batch = payload.slice(index, index + batchSize);
    const { data, error } = await supabase.from('lead_bank').insert(batch).select();
    if (error) throw error;
    inserted.push(...((data ?? []) as Lead[]));
  }

  return inserted;
}
