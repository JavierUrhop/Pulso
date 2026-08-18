-- =====================================================================
-- Pulso · Migración 004 — edición de registros, portadas y limpieza
--
-- Ejecutar UNA VEZ en Supabase → SQL Editor, después de 003.
--
-- Cambios:
--   1. Cada persona puede editar sus propios entrenamientos
--   2. Las competencias pueden tener una foto de portada
--   3. Bucket para esas portadas
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Edición de entrenamientos propios
--    Borrar ya estaba permitido; faltaba poder corregir.
-- ---------------------------------------------------------------------
drop policy if exists workouts_update_own on public.workouts;
create policy workouts_update_own on public.workouts
  for update to authenticated
  using (
    exists (
      select 1 from public.participants p
       where p.id = participant_id
         and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.participants p
       where p.id = participant_id
         and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 2. Portada de la competencia
-- ---------------------------------------------------------------------
alter table public.competitions
  add column if not exists cover_url text;

comment on column public.competitions.cover_url is
  'Imagen de portada, opcional. Se muestra en el listado y en el marcador.';

-- ---------------------------------------------------------------------
-- 3. Bucket de portadas y políticas de storage
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('competition-covers', 'competition-covers', true)
on conflict (id) do nothing;

drop policy if exists "lectura publica fotos" on storage.objects;
create policy "lectura publica fotos" on storage.objects
  for select
  using (bucket_id in ('workout-photos', 'avatars', 'competition-covers'));

drop policy if exists "subida autenticada fotos" on storage.objects;
create policy "subida autenticada fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('workout-photos', 'avatars', 'competition-covers'));

commit;
