export type Customer = {
  id: string;
  customer_code: string;
  full_name: string;
  primary_mobile: string | null;
  primary_email: string | null;
  city: string | null;
  source: string;
  duplicate_score: number;
  created_at: string;
};

export type BankStatement = {
  id: string;
  customer_id: string;
  bank_name: string | null;
  statement_period_start: string | null;
  statement_period_end: string | null;
  file_kind: string;
  page_count: number;
  created_at: string;
};

export type StatementAnalysis = {
  id: string;
  statement_id: string;
  opening_balance: number | null;
  closing_balance: number | null;
  average_balance: number | null;
  highest_credit: number | null;
  highest_debit: number | null;
  minimum_balance: number | null;
  maximum_balance: number | null;
  cash_deposits: number;
  cash_withdrawals: number;
  salary_total: number;
  emi_total: number;
  loan_count: number;
  bounce_charges: number;
  monthly_credits: Record<string, number>;
  monthly_debits: Record<string, number>;
  risk_score: number;
};

export type SalaryRecord = {
  id: string;
  employer: string;
  salary_amount: number;
  salary_date: string;
  confidence: number;
};

export type LoanRecord = {
  id: string;
  lender_name: string;
  emi_amount: number;
  frequency: string;
  estimated_active_loan: boolean;
  confidence: number;
};

export type ContactNumber = {
  id: string;
  number: string;
  occurrence_count: number;
};

export type UpiId = {
  id: string;
  upi: string;
  occurrence_count: number;
};

export type ProcessingJob = {
  id: string;
  statement_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retry' | 'cancelled';
  attempts: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export type CustomerIntelligence = Customer & {
  bank_statements: (BankStatement & {
    statement_analysis: StatementAnalysis[];
    salary_records: SalaryRecord[];
    loan_records: LoanRecord[];
    contact_numbers: ContactNumber[];
    upi_ids: UpiId[];
  })[];
};
