'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOut() {
  const router = useRouter();
  return (
    <button
      className="rounded-lg bg-white/10 px-3 py-1.5 text-[0.75rem] font-semibold text-white/80 transition hover:bg-white/20"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push('/login');
        router.refresh();
      }}>
      Salir
    </button>
  );
}
