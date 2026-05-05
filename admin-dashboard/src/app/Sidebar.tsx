'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { logout } from './actions';

import Image from 'next/image';

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { name: 'Dashboard', icon: '📊', href: '/' },
    { name: 'Users', icon: '👥', href: '/users' },
    { name: 'Security', icon: '🛡️', href: '/security' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header-row">
        <div className="sidebar-logo">
          <Image 
            src="/logo.png" 
            alt="KudiBase Logo" 
            width={36} 
            height={36} 
            className="logo-img" 
          />
          {!isCollapsed && <span>KudiBase Admin</span>}
        </div>
        <button 
          className="btn-collapse" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <a 
            key={item.name}
            href={item.href} 
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
            title={isCollapsed ? item.name : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && <span className="nav-text">{item.name}</span>}
          </a>
        ))}
      </nav>
      <div className="sidebar-footer">
        <form action={logout}>
          <button type="submit" className="btn-sidebar-logout">
            <span>🚪</span> {!isCollapsed && "Sign Out"}
          </button>
        </form>
      </div>
    </aside>
  );
}

