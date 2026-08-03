export type RoleName =
  | 'super_admin'
  | 'admin'
  | 'audit_staff'
  | 'credit_manager'
  | 'operations'
  | 'viewer';

export type UserProfile = {
  id: string;
  email: string;
  full_name?: string | null;
  mobile?: string | null;
  pan?: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type Role = {
  id: string;
  name: RoleName;
  description?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type Permission = {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type Lead = {
  id: string;
  customer_name: string;
  mobile: string;
  source?: string | null;
  city?: string | null;
  email?: string | null;
  pan?: string | null;
  remarks?: string | null;
  status: string;
  score: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type LeadInput = {
  customer_name: string;
  mobile: string;
  source?: string;
  city?: string;
  email?: string;
  pan?: string;
  remarks?: string;
};

export type LeadStats = {
  totalLeads: number;
  todaysLeads: number;
  duplicateLeads: number;
  latestUpload: string;
};
