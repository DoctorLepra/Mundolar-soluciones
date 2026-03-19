'use client';

import React from 'react';

interface AdminActionFooterProps {
  children: React.ReactNode;
}

export default function AdminActionFooter({ children }: AdminActionFooterProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 p-4 pb-8 flex items-center justify-center gap-4 shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300">
      <div className="w-full max-w-lg flex gap-3">
        {children}
      </div>
    </div>
  );
}
