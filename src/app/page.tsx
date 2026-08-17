import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { weekNumberFor, formatWeekRange } from '@/lib/week';
import { Empty, Brand } from '@/components/ui';
import SignOut from '@/components/SignOut';
import type { Competition } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: competitions } = await supabase
    .from('competitions').select('*').eq('is_active', true)
    .order('start_date', { ascending: false });

  const { data: mine } = await supabase
    .from('participants').select('competition_id, display_name, nickname')
    .eq('user_id', user!.id);

  const claimed = new Map((mine ?? []).map(p => [p.competition_id, p]));

  return (
    <>
      <section className="-mx-4 -mt-5 mb-5 bg-navy-grad px-4 pb-6 pt-6 text-white
                          [padding-top:calc(1.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-2xl items-start justify-between">
          <div>
            <Brand dark />
            <h1 className="display mt-3 text-2xl leading-none">Competencias</h1>
            <p className="mt-1.5 text-[0.8125rem] text-white/60">{user?.email}</p>
          </div>
          <SignOut />
        </div>
      </section>

      {!competitions?.length ? (
        <Empty
          title="Sin competencias activas"
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
                className="card flex items-center gap-3 p-4 transition hover:bg-ice-sunk">
                <span className="team-bar bg-navy-800" />
                <div className="min-w-0 flex-1">
                  <p className="display truncate text-lg leading-tight">{c.name}</p>
                  <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
                    Semana {week} · {formatWeekRange(c.start_date, week)}
                  </p>
                </div>
                <span className={`chip shrink-0 ${me
                  ? 'bg-win/15 text-win' : 'bg-ice-sunk text-ink-soft'}`}>
                  {me ? 'Inscrito' : 'Elegir cupo'}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-8 border-t border-line pt-4">
        <Link href="/admin"
          className="text-[0.8125rem] font-medium text-ink-faint underline underline-offset-2">
          Panel de administración
        </Link>
      </div>
    </>
  );
}
