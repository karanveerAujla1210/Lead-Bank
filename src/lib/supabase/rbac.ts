import { createAdminClient } from './admin';
import type { RoleName } from '@/lib/types';

type CreateUserInput = {
  email: string;
  password: string;
  full_name?: string;
  mobile?: string;
  pan?: string;
  role: RoleName;
};

export async function createUserWithRole(input: CreateUserInput) {
  const supabase = createAdminClient();
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (authError) throw authError;
  if (!authData.user) throw new Error('Supabase did not return the created auth user.');

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      email: input.email,
      full_name: input.full_name ?? input.email.split('@')[0],
      mobile: input.mobile,
      metadata: input.pan ? { pan: input.pan } : {},
    })
    .select()
    .single();
  if (profileError) throw profileError;

  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('key', input.role)
    .single();
  if (roleError) throw roleError;

  const { error: userRoleError } = await supabase
    .from('user_roles')
    .insert({ user_id: profile.id, role_id: role.id });
  if (userRoleError) throw userRoleError;

  return { authUser: authData.user, profile };
}
