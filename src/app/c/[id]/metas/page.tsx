import { notFound } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { createScoringContext, buildExclusions, goalTimeline } from '@/lib/scoring';
import { BackLink } from '@/components/ui';
import GoalTracker from './GoalTracker';
import type { Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Metas({ params }: { params: { id: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();

  const {
    competition, participants, workouts, wildcards, goals, inactive, me, currentWeek,
  } = data;

  const ctx = createScoringContext(
    competition, participants, workouts, goals, currentWeek,
    buildExclusions(wildcards, inactive));

  const rows = participants
    .filter(p => p.is_active)
    .map(p => {
      const t = goalTimeline(competition, p, workouts, goals, currentWeek, ctx);
      return {
        id: p.id,
        name: p.nickname || p.display_name,
        avatarUrl: p.avatar_url,
        team: p.team as Team,
        category: p.category,
        isMe: p.id === me?.id,
        goal: t.goal,
        progress: t.progress,
        remaining: t.remaining,
        threshold: t.threshold,
        weeks: t.weeks,
      };
    })
    // Primero quienes están más cerca de subir la meta.
    .sort((a, b) => a.remaining - b.remaining || b.goal - a.goal
      || a.name.localeCompare(b.name, 'es'));

  return (
    <>
      <section className="-mx-4 -mt-5 mb-4 bg-navy-grad px-4 pb-5 pt-6 text-white
                          [padding-top:calc(1.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-2xl">
          <BackLink href={`/c/${params.id}`}>
            <span className="text-white/75">Marcador</span>
          </BackLink>
          <h1 className="display mt-3 text-2xl leading-none">Metas</h1>
          <p className="mt-2 text-[0.8125rem] text-white/70">
            Cada semana en que llegas a tu meta —o la superas— suma una marca.
            Al juntar {rows[0]?.threshold ?? competition.streak_to_raise}, tu meta
            sube en 1 y el contador vuelve a cero.
          </p>
        </div>
      </section>

      <GoalTracker rows={rows} maxWeekly={competition.max_weekly} currentWeek={currentWeek} />
    </>
  );
}
