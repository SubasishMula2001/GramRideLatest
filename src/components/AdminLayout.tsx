import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar 
        collapsed={sidebarCollapsed} 
        onCollapsedChange={setSidebarCollapsed} 
      />
      
      <main 
        className={`
          transition-all duration-300 ease-in-out p-8
          ${sidebarCollapsed ? 'ml-20' : 'ml-64'}
        `}
      >
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
