import { notFound, redirect } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { scoreWeek, createScoringContext, buildExclusions } from '@/lib/scoring';
import { registrationSlots } from '@/lib/week';
import { BackLink } from '@/components/ui';
import WorkoutForm from './WorkoutForm';

export const dynamic = 'force-dynamic';

export default async function Registrar({ params }: { params: { id: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();
  if (!data.me) redirect(`/c/${params.id}/asignarme`);

  const {
    competition, participants, workouts, wildcards, goals, inactive,
    me, currentWeek, sports, finished,
  } = data;

  if (finished) {
    return (
      <>
        <BackLink href={`/c/${params.id}`}>Marcador</BackLink>
        <div className="card mt-6 p-6 text-center">
          <p className="display text-lg">Competencia finalizada</p>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-soft">
            Terminó en la semana {competition.total_weeks}. Ya no se pueden registrar
            entrenamientos.
          </p>
        </div>
      </>
    );
  }

  // Solo se puede anotar lo de hoy o lo de ayer. Un lunes, "ayer" cae en la
  // semana anterior, y la opción ya viene con esa semana resuelta.
  const slots = registrationSlots(competition.start_date, competition.total_weeks);

  const { scores } = scoreWeek(
    competition, participants, workouts, wildcards, goals, currentWeek,
    createScoringContext(competition, participants, workouts, goals, currentWeek,
      buildExclusions(wildcards, inactive)));
  const mine = scores.find(s => s.participantId === me.id)!;

  // Cuántos lleva en cada semana alcanzable, para controlar el tope.
  const weekCounts: Record<number, number> = {};
  for (const slot of slots) {
    weekCounts[slot.weekNumber] = workouts.filter(
      w => w.participant_id === me.id && w.week_number === slot.weekNumber).length;
  }

  // Si la única opción es una semana pasada, el comodín que importa es el de esa semana.
  const wildcardWeeks = new Set(
    wildcards.filter(w => w.participant_id === me.id).map(w => w.week_number));
  const blocked = slots.length > 0 && slots.every(s => wildcardWeeks.has(s.weekNumber));

  return (
    <>
      <BackLink href={`/c/${params.id}`}>Marcador</BackLink>
      <h1 className="display mb-1 mt-3 text-2xl leading-none">Registrar</h1>
      <p className="mb-5 text-[0.8125rem] text-ink-soft">
        Semana {currentWeek} de {competition.total_weeks} · solo se puede anotar hoy o ayer
      </p>

      <WorkoutForm
        competitionId={params.id} participantId={me.id}
        slots={slots} sports={sports}
        alreadyThisWeek={mine.workoutCount} weekCounts={weekCounts}
        maxWeekly={competition.max_weekly} goal={mine.goal}
        usedWildcard={blocked} team={me.team}
      />
    </>
  );
}
