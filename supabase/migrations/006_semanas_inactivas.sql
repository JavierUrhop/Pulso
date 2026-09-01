-- =====================================================================
-- Pulso · Migración 006 — semanas inactivas por participante
--
-- Ejecutar UNA VEZ en Supabase → SQL Editor, después de 005.
--
-- Permite que el administrador marque, semana a semana, si una persona
-- estuvo activa. Una semana marcada como inactiva no suma sus puntos ni
-- entra en el promedio per cápita del equipo, y tampoco impide el bono
-- de equipo completo. Sirve para vacaciones, licencias o incorporaciones
-- a mitad de temporada.
--
-- Es distinto del comodín: el comodín lo usa la propia persona y es uno
-- por temporada; esto lo decide el administrador y no tiene tope.
-- =====================================================================

begin;

create table if not exists public.inactive_weeks (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid not null references public.competitions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  week_number     int  not null check (week_number >= 1),
  reason          text,
  created_at      timestamptz not null default now(),
  unique (participant_id, week_number)
);

create index if not exists inactive_weeks_competition_idx
  on public.inactive_weeks (competition_id, week_number);

alter table public.inactive_weeks enable row level security;

-- Lectura abierta: la app muestra quién queda fuera de cada semana, para
-- que el marcador se entienda. La escritura solo pasa por el panel de
-- administración, que usa service_role y salta RLS.
drop policy if exists inactive_weeks_read on public.inactive_weeks;
create policy inactive_weeks_read on public.inactive_weeks
  for select to authenticated using (true);

commit;
