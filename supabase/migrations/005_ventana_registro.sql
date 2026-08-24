-- =====================================================================
-- Pulso · Migración 005 — ventana de registro de 24 horas
--
-- Ejecutar UNA VEZ en Supabase → SQL Editor, después de 004.
--
-- Un entrenamiento solo puede anotarse el mismo día o el día siguiente.
-- La comprobación se hace en horario de Chile y contra el calendario de
-- la competencia, así que el domingo registrado un lunes cae en la
-- semana anterior sin problema.
--
-- Se valida en la base y no solo en la pantalla, porque de otro modo
-- bastaría con enviar otros valores para saltarse la regla.
-- =====================================================================

begin;

create or replace function public.workout_is_recent(
  p_competition uuid,
  p_week int,
  p_day int
)
returns boolean
language plpgsql
stable
as $$
declare
  v_start      date;
  v_total      int;
  v_today      date;
  v_candidate  date;
  v_week       int;
  v_day        int;
  i            int;
begin
  select start_date, total_weeks into v_start, v_total
    from public.competitions where id = p_competition;

  if v_start is null then
    return false;
  end if;

  v_today := (timezone('America/Santiago', now()))::date;

  -- Se prueba con hoy y con ayer.
  for i in 0..1 loop
    v_candidate := v_today - i;

    -- date_trunc('week') en Postgres arranca el lunes, igual que la app.
    v_week := floor(
      (date_trunc('week', v_candidate)::date - date_trunc('week', v_start)::date) / 7.0
    )::int + 1;
    v_day := extract(isodow from v_candidate)::int;

    if v_week between 1 and v_total
       and v_week = p_week
       and v_day = p_day then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

create or replace function public.enforce_recent_workout()
returns trigger
language plpgsql
as $$
begin
  -- Al editar, solo se revisa si cambió la fecha del entrenamiento.
  -- Corregir el deporte, la nota o las fotos sigue siendo posible después.
  if tg_op = 'UPDATE'
     and new.week_number = old.week_number
     and new.day_of_week = old.day_of_week then
    return new;
  end if;

  if not public.workout_is_recent(new.competition_id, new.week_number, new.day_of_week) then
    raise exception
      'Solo puedes registrar el entrenamiento de hoy o el de ayer.';
  end if;

  return new;
end;
$$;

drop trigger if exists workouts_recent on public.workouts;
create trigger workouts_recent
  before insert or update on public.workouts
  for each row execute function public.enforce_recent_workout();

commit;
