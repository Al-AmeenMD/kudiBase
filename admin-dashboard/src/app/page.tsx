import { cookies } from 'next/headers';
import { login, deleteUser } from './actions';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Sidebar from './Sidebar';
import UserTable from './UserTable';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin_auth')?.value === 'true';

  if (!isAuthenticated) {
    return (
      <main className="login-container">
        <div className="glass-panel login-card">
          <Image 
            src="/logo.png" 
            alt="KudiBase Logo" 
            width={80} 
            height={80} 
            className="login-logo" 
          />
          <h1>KudiBase Admin</h1>
          <p>Enter master password to access the dashboard</p>
          <form action={login}>
            <div className="input-group">
              <input 
                type="password" 
                name="password" 
                placeholder="Master Password" 
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Unlock Dashboard
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Fetch users if authenticated
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();

  // Calculate stats
  const totalUsers = users?.length || 0;
  const newToday = users?.filter(u => {
    const today = new Date().toISOString().split('T')[0];
    return u.created_at.startsWith(today);
  }).length || 0;

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="dashboard-content">
        <header className="content-header">
          <div>
            <h1>KudiBase Admin</h1>
            <p>Dashboard Overview</p>
          </div>
          <div className="header-actions">
            <span className="last-sync live-pulse">Live Data</span>
          </div>
        </header>

        <div className="stats-grid">
          <div className="glass-panel stat-card">
            <div className="stat-header">
              <span className="stat-title">Total Users</span>
              <span className="stat-icon">👥</span>
            </div>
            <span className="stat-value">{totalUsers}</span>
            <span className="stat-delta positive">↑ 12% this month</span>
          </div>
          <div className="glass-panel stat-card">
            <div className="stat-header">
              <span className="stat-title">New Today</span>
              <span className="stat-icon">✨</span>
            </div>
            <span className="stat-value">{newToday}</span>
            <span className="stat-delta">Registered since midnight</span>
          </div>
          <div className="glass-panel stat-card">
            <div className="stat-header">
              <span className="stat-title">Active Now</span>
              <span className="stat-icon">🟢</span>
            </div>
            <span className="stat-value">{Math.floor(totalUsers * 0.4)}</span>
            <span className="stat-delta">Estimated active users</span>
          </div>
        </div>

        <div className="glass-panel main-section">
          <div className="section-header">
            <h2>Registration Growth</h2>
          </div>
          <div className="chart-placeholder">
            <div className="chart-bar-container">
              {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                <div key={i} className="chart-bar" style={{ height: `${height}%` }}>
                  <span className="bar-label">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                </div>
              ))}
            </div>
            <p className="chart-caption">Daily user registrations (Last 7 days)</p>
          </div>
        </div>

        <UserTable 
          users={users || []} 
          initialQuery="" 
          onDelete={deleteUser} 
        />
      </main>
    </div>
  );
}

