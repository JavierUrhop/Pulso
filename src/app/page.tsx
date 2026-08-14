import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { weekNumberFor, formatWeekRange } from '@/lib/week';
import { Empty } from '@/components/ui';
import SignOut from '@/components/SignOut';
import type { Competition } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: competitions } = await supabase
    .from('competitions')
    .select('*')
    .eq('is_active', true)
    .order('start_date', { ascending: false });

  const { data: mine } = await supabase
    .from('participants')
    .select('competition_id, display_name, nickname')
    .eq('user_id', user!.id);

  const claimed = new Map((mine ?? []).map(p => [p.competition_id, p]));

  return (
    <>
      <header className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M2 16h6l3-8 5 16 4-11 3 3h7" stroke="currentColor" strokeWidth="2.4"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-medium tracking-tight">Pulso</span>
          </div>
          <h1 className="mt-1.5 text-xl font-medium">Competencias activas</h1>
          <p className="mt-0.5 text-sm text-ink-soft">{user?.email}</p>
        </div>
        <SignOut />
      </header>

      {!competitions?.length ? (
        <Empty
          title="Todavía no hay competencias"
          body="Cuando el administrador cree una, aparecerá aquí para que te sumes."
          action={<Link href="/admin" className="btn">Entrar como administrador</Link>}
        />
      ) : (
        <div className="space-y-3">
          {(competitions as Competition[]).map(c => {
            const week = weekNumberFor(c.start_date);
            const me = claimed.get(c.id);
            return (
              <Link key={c.id} href={`/c/${c.id}`}
                className="card block p-4 transition hover:bg-paper-sunk">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      Semana {week} · {formatWeekRange(c.start_date, week)}
                    </p>
                  </div>
                  <span className={`chip shrink-0 ${me
                    ? 'bg-teamB-soft text-teamB-ink' : 'bg-paper-sunk text-ink-soft'}`}>
                    {me ? (me.nickname || me.display_name) : 'Sin asignar'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-8 border-t border-line pt-4">
        <Link href="/admin" className="text-[13px] text-ink-faint underline underline-offset-2">
          Panel de administración
        </Link>
      </div>
    </>
  );
}
