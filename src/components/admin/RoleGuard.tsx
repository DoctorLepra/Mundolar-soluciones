'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile && allowedRoles.includes(profile.role)) {
          setAuthorized(true);
        } else {
          router.push('/admin');
        }
      } catch (error) {
        console.error('RoleGuard Error:', error);
        router.push('/admin');
      } finally {
        setChecking(false);
      }
    }
    checkRole();
  }, [allowedRoles, router]);

  if (checking) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 bg-slate-50 h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
          <p className="text-slate-500 font-display font-medium animate-pulse">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}
