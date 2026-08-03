import { guardRequest } from '@/lib/platform/request-guard';

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await guardRequest(request, 'leads.read', 'leads.export');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status');
  const source = searchParams.get('source');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let query = auth.supabase
    .from('lead_bank')
    .select('id,customer_name,mobile,email,source,city,status,score,remarks,created_at,updated_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10000);

  if (search) query = query.or(`customer_name.ilike.%${search}%,mobile.ilike.%${search}%`);
  if (status) query = query.eq('status', status);
  if (source) query = query.eq('source', source);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 400 });

  const headers = ['id', 'customer_name', 'mobile', 'email', 'source', 'city', 'status', 'score', 'remarks', 'created_at', 'updated_at'];
  const rows = (data ?? []).map((row) =>
    headers.map((h) => JSON.stringify((row as Record<string, unknown>)[h] ?? '')).join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
