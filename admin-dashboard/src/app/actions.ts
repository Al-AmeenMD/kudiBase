'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

export async function login(formData: FormData) {
  const password = formData.get('password');
  
  // Try to get password from database, fallback to ENV
  const { data: dbPass } = await supabaseAdmin
    .from('admin_settings')
    .select('value')
    .eq('key', 'master_password')
    .single();

  const adminPassword = dbPass?.value || process.env.ADMIN_PASSWORD || 'admin123';

  if (password === adminPassword) {
    const cookieStore = await cookies();
    cookieStore.set('admin_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
    });
    redirect('/');
  }
  return { success: false, error: 'Invalid password' };
}

export async function updateMasterPassword(newPassword: string) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin_auth')?.value === 'true';
  if (!isAuthenticated) throw new Error('Unauthorized');

  const { error } = await supabaseAdmin
    .from('admin_settings')
    .upsert({ key: 'master_password', value: newPassword });

  if (error) throw error;
  revalidatePath('/');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_auth');
  revalidatePath('/');
}

export async function deleteUser(userId: string) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin_auth')?.value === 'true';
  if (!isAuthenticated) throw new Error('Unauthorized');

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw error;
  revalidatePath('/');
}

export async function toggleUserStatus(userId: string, currentBanDuration: string | undefined) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin_auth')?.value === 'true';
  if (!isAuthenticated) throw new Error('Unauthorized');

  const isBanned = currentBanDuration && currentBanDuration !== 'none';
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: isBanned ? 'none' : '87600h',
  });

  if (error) throw error;
  revalidatePath('/');
}

export async function sendResetEmail(email: string) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin_auth')?.value === 'true';
  if (!isAuthenticated) throw new Error('Unauthorized');

  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function updateUserMetadata(userId: string, metadata: any) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin_auth')?.value === 'true';
  if (!isAuthenticated) throw new Error('Unauthorized');

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: metadata,
  });

  if (error) throw error;
  revalidatePath('/');
}

