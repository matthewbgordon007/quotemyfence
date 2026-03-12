'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace('/login');
      router.refresh();
    })();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <p className="text-slate-500">Signing you out…</p>
    </div>
  );
}
