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
      <BackLink href={`/c/${params.id}`}>Volver</BackLink>
      <h1 className="mb-5 mt-4 text-xl font-medium">Registrar entrenamiento</h1>

      <WorkoutForm
        competitionId={params.id}
        participantId={me.id}
        weekNumber={currentWeek}
        sports={sports.map(s => s.name)}
        alreadyThisWeek={mine.workoutCount}
        maxWeekly={competition.max_weekly}
        goal={mine.goal}
        usedWildcard={mine.usedWildcard}
      />
    </>
  );
}
