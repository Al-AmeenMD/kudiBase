import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { deleteUser } from '../actions';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Sidebar from '../Sidebar';
import UserTable from '../UserTable';

export const dynamic = 'force-dynamic';

export default async function UsersPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q?.toLowerCase() || '';

  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin_auth')?.value === 'true';

  if (!isAuthenticated) {
    redirect('/');
  }

  // Fetch users
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    return <div>Error loading users: {error.message}</div>;
  }

  // Filter users
  let filteredUsers = users || [];
  if (q) {
    filteredUsers = users.filter((user) => {
      const emailMatch = user.email?.toLowerCase().includes(q);
      const businessMatch = user.user_metadata?.business_name?.toLowerCase().includes(q);
      const ownerMatch = user.user_metadata?.owner_name?.toLowerCase().includes(q);
      return emailMatch || businessMatch || ownerMatch;
    });
  }

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="dashboard-content">
        <header className="content-header">
          <div>
            <h1>KudiBase Admin</h1>
            <p>User Management</p>
          </div>
        </header>

        <div className="glass-panel main-section">
          <UserTable 
            users={filteredUsers} 
            initialQuery={q} 
            onDelete={async (id) => {
              'use server';
              await deleteUser(id);
            }} 
          />
        </div>
      </main>
    </div>
  );
}
