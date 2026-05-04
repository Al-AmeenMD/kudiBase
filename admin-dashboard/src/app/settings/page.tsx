import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '../Sidebar';
import { updateMasterPassword } from '../actions';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('admin_auth')?.value === 'true';

  if (!isAuthenticated) {
    redirect('/');
  }

  async function handleUpdate(formData: FormData) {
    'use server';
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      // In a real app, you'd use a search param or state to show this error
      return; 
    }

    await updateMasterPassword(newPassword);
    redirect('/');
  }

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="dashboard-content">
        <header className="content-header">
          <div>
            <h1>Settings</h1>
            <p>Configure your administrative access</p>
          </div>
        </header>

        <div className="glass-panel main-section" style={{ maxWidth: '600px' }}>
          <div className="section-header">
            <h2>Change Master Password</h2>
          </div>
          
          <form action={handleUpdate} className="settings-form">
            <div className="input-group">
              <label>New Master Password</label>
              <input 
                type="password" 
                name="newPassword" 
                placeholder="Enter new password" 
                required 
                minLength={6}
              />
            </div>
            <div className="input-group">
              <label>Confirm Password</label>
              <input 
                type="password" 
                name="confirmPassword" 
                placeholder="Confirm new password" 
                required 
                minLength={6}
              />
            </div>
            <div style={{ marginTop: '32px' }}>
              <button type="submit" className="btn btn-primary">
                Update Password
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
