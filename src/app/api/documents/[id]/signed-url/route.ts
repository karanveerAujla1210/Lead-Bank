import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';

const SIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await guardRequest(request, 'statements.read', 'documents.signed-url');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { data: doc, error: docError } = await auth.supabase
    .from('customer_documents')
    .select('bucket, object_path')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const { data, error } = await auth.supabase.storage
    .from(doc.bucket)
    .createSignedUrl(doc.object_path, SIGNED_URL_EXPIRY_SECONDS);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ signed_url: data.signedUrl, expires_in: SIGNED_URL_EXPIRY_SECONDS });
}
