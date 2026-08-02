export type Lead = {
  id: string;
  customer_name: string;
  mobile: string;
  source: string;
  city: string;
  remarks: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type LeadInput = {
  customer_name: string;
  mobile: string;
  source: string;
  city: string;
  remarks: string;
};

export type LeadStats = {
  totalLeads: number;
  todaysLeads: number;
  duplicateLeads: number;
  latestUpload: string;
};
