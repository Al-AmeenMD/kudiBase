'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import DeleteButton from './DeleteButton';
import UserDetailModal from './UserDetailModal';
import SearchInput from './SearchInput';
import ExportButton from './ExportButton';

export default function UserTable({ 
  users, 
  initialQuery, 
  onDelete 
}: { 
  users: User[]; 
  initialQuery: string;
  onDelete: (id: string) => Promise<void>;
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  return (
    <>
      <div className="section-header">
        <h2>Registered Users</h2>
        <div className="controls-row">
          <SearchInput initialQuery={initialQuery} />
          <ExportButton users={users} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>User Profile</th>
              <th>Status</th>
              <th>Join Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <p>No users found matching "{initialQuery}"</p>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="user-row">
                  <td>
                    <div className="user-info-cell">
                      <div className="user-avatar">
                        {user.email?.[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="user-email">{user.email}</div>
                        <div className="user-business">
                          {user.user_metadata?.business_name || 'Individual'} 
                          {user.user_metadata?.owner_name ? ` • ${user.user_metadata.owner_name}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-active">Active</span>
                  </td>
                  <td>
                    <div className="date-cell">
                      {new Date(user.created_at).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric' 
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="action-cell">
                      <button 
                        className="btn-icon-action" 
                        title="View Details"
                        onClick={() => setSelectedUser(user)}
                      >
                        👁️
                      </button>
                      <form action={() => onDelete(user.id)}>
                        <DeleteButton />
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <UserDetailModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
        />
      )}
    </>
  );
}
