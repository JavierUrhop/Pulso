import { notFound, redirect } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { scoreWeek } from '@/lib/scoring';
import { BackLink } from '@/components/ui';
import WorkoutForm from './WorkoutForm';

export const dynamic = 'force-dynamic';

export default async function Registrar({ params }: { params: { id: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();
  if (!data.me) redirect(`/c/${params.id}/asignarme`);

  const { competition, participants, workouts, wildcards, goals, me, currentWeek, sports } = data;
  const { scores } = scoreWeek(competition, participants, workouts, wildcards, goals, currentWeek);
  const mine = scores.find(s => s.participantId === me.id)!;

  return (
    <>
      <BackLink href={`/c/${params.id}`}>Marcador</BackLink>
      <h1 className="display mb-1 mt-3 text-2xl leading-none">Registrar</h1>
      <p className="mb-5 text-[13px] text-ink-soft">Semana {currentWeek}</p>

      <WorkoutForm
        competitionId={params.id} participantId={me.id} weekNumber={currentWeek}
        sports={sports.map(s => s.name)} alreadyThisWeek={mine.workoutCount}
        maxWeekly={competition.max_weekly} goal={mine.goal}
        usedWildcard={mine.usedWildcard} team={me.team}
      />
    </>
  );
}
