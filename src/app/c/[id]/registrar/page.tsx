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

  const { competition, participants, workouts, wildcards, goals, me, currentWeek, sports, finished } = data;
  const { scores } = scoreWeek(competition, participants, workouts, wildcards, goals, currentWeek);
  const mine = scores.find(s => s.participantId === me.id)!;

  if (finished) {
    return (
      <>
        <BackLink href={`/c/${params.id}`}>Marcador</BackLink>
        <div className="card mt-6 p-6 text-center">
          <p className="display text-lg">Competencia finalizada</p>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-soft">
            Terminó en la semana {competition.total_weeks}. Ya no se pueden registrar entrenamientos.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <BackLink href={`/c/${params.id}`}>Marcador</BackLink>
      <h1 className="display mb-1 mt-3 text-2xl leading-none">Registrar</h1>
      <p className="mb-5 text-[13px] text-ink-soft">
        Semana {currentWeek} de {competition.total_weeks}
      </p>

      <WorkoutForm
        competitionId={params.id} participantId={me.id} weekNumber={currentWeek}
        sports={sports} alreadyThisWeek={mine.workoutCount}
        maxWeekly={competition.max_weekly} goal={mine.goal}
        usedWildcard={mine.usedWildcard} team={me.team}
      />
    </>
  );
}
