
import React from 'react';
import AdminSidebar from '@/components/admin/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
         {/* Top header could go here if separate from Sidebar */}
        {children}
      </div>
    </div>
  );
}
