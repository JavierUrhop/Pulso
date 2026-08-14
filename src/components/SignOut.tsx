'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOut() {
  const router = useRouter();
  return (
    <button
      className="text-[13px] text-ink-faint underline underline-offset-2"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push('/login');
        router.refresh();
      }}>
      Salir
    </button>
  );
}
