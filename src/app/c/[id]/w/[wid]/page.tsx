import { notFound, redirect } from 'next/navigation';
import { loadCompetition } from '@/lib/data';
import { BackLink } from '@/components/ui';
import { registrationSlots } from '@/lib/week';
import EditWorkout from './EditWorkout';

export const dynamic = 'force-dynamic';

export default async function EditarEntrenamiento({
  params,
}: { params: { id: string; wid: string } }) {
  const data = await loadCompetition(params.id);
  if (!data) notFound();
  if (!data.me) redirect(`/c/${params.id}/asignarme`);

  const workout = data.workouts.find(w => w.id === params.wid);
  if (!workout) notFound();

  // Solo el dueño del registro puede editarlo. La base lo exige igual,
  // pero así se evita mostrar un formulario que no va a poder guardar.
  if (workout.participant_id !== data.me.id) {
    redirect(`/c/${params.id}/p/${workout.participant_id}?semana=${workout.week_number}`);
  }

  return (
    <>
      <BackLink href={`/c/${params.id}/p/${data.me.id}?semana=${workout.week_number}`}>
        Mi bitácora
      </BackLink>
      <h1 className="display mb-1 mt-3 text-2xl leading-none">Editar entrenamiento</h1>
      <p className="mb-5 text-[0.8125rem] text-ink-soft">Semana {workout.week_number}</p>

      <EditWorkout
        competitionId={params.id}
        workout={workout}
        sports={data.sports}
        team={data.me.team}
        participantId={data.me.id}
        slots={registrationSlots(
          data.competition.start_date, data.competition.total_weeks)}
      />
    </>
  );
}
