import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Job = {
  id: string;
  statement_id: string;
  attempts: number;
  pipeline_state: Record<string, unknown>;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

Deno.serve(async () => {
  const workerId = crypto.randomUUID();
  const { data: job, error: claimError } = await supabase.rpc('claim_statement_job', { worker_id: workerId });

  if (claimError) {
    return Response.json({ error: claimError.message }, { status: 500 });
  }
  if (!job) {
    return Response.json({ claimed: false });
  }

  try {
    await processJob(job as Job);
    await supabase.rpc('complete_statement_job', {
      job_id: job.id,
      state: { worker_id: workerId, completed_by: 'process-statement' },
    });
    await dispatchNotification(job as Job, 'completed');
    return Response.json({ claimed: true, job_id: job.id, status: 'completed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown processing failure';
    await supabase.rpc('fail_statement_job', {
      job_id: job.id,
      code: 'PROCESSING_FAILED',
      message,
    });
    await dispatchNotification(job as Job, 'failed', message);
    return Response.json({ claimed: true, job_id: job.id, status: 'failed' }, { status: 500 });
  }
});

async function processJob(job: Job) {
  const { data: statement, error } = await supabase
    .from('bank_statements')
    .select('*, customer_documents(*)')
    .eq('id', job.statement_id)
    .single();

  if (error) throw error;
  if (!statement?.customer_documents?.object_path) {
    throw new Error('Statement document is missing.');
  }

  const parserEndpoint = Deno.env.get('STATEMENT_PARSER_ENDPOINT');
  const parserToken = Deno.env.get('STATEMENT_PARSER_TOKEN');
  const publicAppUrl = Deno.env.get('PUBLIC_APP_URL');
  const workerApiToken = Deno.env.get('WORKER_API_TOKEN');

  if (!parserEndpoint || !parserToken || !publicAppUrl || !workerApiToken) {
    throw new Error('STATEMENT_PARSER_ENDPOINT, STATEMENT_PARSER_TOKEN, PUBLIC_APP_URL and WORKER_API_TOKEN are required.');
  }

  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from(statement.customer_documents.bucket)
    .createSignedUrl(statement.customer_documents.object_path, 300);
  if (signedUrlError) throw signedUrlError;

  const parserResponse = await fetch(parserEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${parserToken}`,
    },
    body: JSON.stringify({
      job_id: job.id,
      statement_id: job.statement_id,
      file_url: signedUrl.signedUrl,
      mime_type: statement.customer_documents.mime_type,
      password_required: statement.password_required,
      password_secret_ref: statement.password_secret_ref,
    }),
  });

  if (!parserResponse.ok) {
    throw new Error(`Statement parser failed with status ${parserResponse.status}.`);
  }

  const parserResult = await parserResponse.json();
  if (!Array.isArray(parserResult.transactions)) {
    throw new Error('Statement parser response must contain transactions array.');
  }

  const ingestResponse = await fetch(`${publicAppUrl.replace(/\/$/, '')}/api/statements/${job.statement_id}/transactions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${workerApiToken}`,
    },
    body: JSON.stringify({ transactions: parserResult.transactions }),
  });

  if (!ingestResponse.ok) {
    throw new Error(`Transaction ingestion failed with status ${ingestResponse.status}.`);
  }
}

async function dispatchNotification(job: Job, outcome: 'completed' | 'failed', errorMessage?: string) {
  // Resolve the user who uploaded this statement via the job's created_by
  const { data: jobRow } = await supabase
    .from('statement_processing_jobs')
    .select('created_by')
    .eq('id', job.id)
    .single();

  const userId = jobRow?.created_by;
  if (!userId) return;

  const isCompleted = outcome === 'completed';
  await supabase.from('notifications').insert({
    user_id: userId,
    title: isCompleted ? 'Statement analysis ready' : 'Statement processing failed',
    message: isCompleted
      ? `Your bank statement has been processed and analysis is ready.`
      : `Statement processing failed: ${errorMessage ?? 'Unknown error'}. It will be retried automatically.`,
    type: isCompleted ? 'success' : 'error',
    payload: { job_id: job.id, statement_id: job.statement_id },
  });
}
