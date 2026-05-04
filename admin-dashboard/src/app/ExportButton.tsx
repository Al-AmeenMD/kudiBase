'use client';

import { User } from '@supabase/supabase-js';

export default function ExportButton({ users }: { users: User[] }) {
  const handleExport = () => {
    // Define headers
    const headers = ['Email', 'Business Name', 'Owner Name', 'Joined Date'];
    
    // Convert users to CSV rows
    const rows = users.map(user => {
      const email = user.email || '';
      const businessName = user.user_metadata?.business_name || '';
      const ownerName = user.user_metadata?.owner_name || '';
      const joined = new Date(user.created_at).toLocaleDateString();
      
      // Escape fields that might contain commas
      return [
        `"${email.replace(/"/g, '""')}"`,
        `"${businessName.replace(/"/g, '""')}"`,
        `"${ownerName.replace(/"/g, '""')}"`,
        `"${joined}"`
      ].join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create blob and download trigger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `kudibase_users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button onClick={handleExport} className="btn btn-export">
      Export CSV
    </button>
  );
}
