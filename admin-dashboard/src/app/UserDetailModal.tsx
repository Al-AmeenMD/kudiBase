'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { toggleUserStatus, sendResetEmail } from './actions';

export default function UserDetailModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  // @ts-ignore - ban_duration might not be in the standard User type but is present in the response
  const isBanned = user.ban_duration && user.ban_duration !== 'none';

  const handleToggleStatus = async () => {
    try {
      setLoading(true);
      // @ts-ignore
      await toggleUserStatus(user.id, user.ban_duration);
      alert(isBanned ? 'User unbanned successfully' : 'User banned successfully');
      onClose();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user.email) return;
    try {
      setLoading(true);
      await sendResetEmail(user.email);
      alert('Password reset email sent to ' + user.email);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <h2>User Details</h2>
            <span className={`badge ${isBanned ? 'badge-danger' : 'badge-active'}`}>
              {isBanned ? 'Suspended' : 'Active'}
            </span>
          </div>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="detail-section">
            <h3>Authentication</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>User ID</label>
                <span>{user.id}</span>
              </div>
              <div className="detail-item">
                <label>Email</label>
                <span>{user.email}</span>
              </div>
              <div className="detail-item">
                <label>Joined</label>
                <span>{new Date(user.created_at).toLocaleString('en-US')}</span>
              </div>
              <div className="detail-item">
                <label>Last Sign In</label>
                <span>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-US') : 'Never'}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Metadata</h3>
            <pre className="metadata-pre">
              {JSON.stringify(user.user_metadata, null, 2)}
            </pre>
          </div>
        </div>

        <div className="modal-footer">
          <div className="modal-actions-left">
            <button 
              className={`btn ${isBanned ? 'btn-primary' : 'btn-warning'}`}
              onClick={handleToggleStatus}
              disabled={loading}
            >
              {loading ? 'Processing...' : (isBanned ? '✅ Unsuspend User' : '🚫 Suspend User')}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleResetPassword}
              disabled={loading}
            >
              📧 Send Reset Email
            </button>
          </div>
          <button className="btn btn-close-modal" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

