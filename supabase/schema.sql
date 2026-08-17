-- =====================================================================
-- Pulso — esquema de base de datos
-- Ejecutar completo en Supabase → SQL Editor → New query
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Perfiles (espejo de auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. Competencias
-- ---------------------------------------------------------------------
create table if not exists public.competitions (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  start_date            date not null,
  end_date              date,
  goal_initial          int  not null default 2,
  goal_advanced         int  not null default 3,
  total_weeks           int  not null default 12 check (total_weeks between 1 and 52),
  max_weekly            int  not null default 6,
  bonus_goal_met        int  not null default 2,
  bonus_goal_exceeded   int  not null default 1,
  bonus_team_sweep      int  not null default 5,
  streak_to_raise       int  not null default 3,
  wildcards_per_person  int  not null default 1,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Participantes
--    El admin crea el cupo (display_name, equipo, categoría).
--    La persona lo reclama con su cuenta -> user_id queda fijo.
-- ---------------------------------------------------------------------
create table if not exists public.participants (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid not null references public.competitions(id) on delete cascade,
  display_name    text not null,
  nickname        text,
  avatar_url      text,
  team            text not null check (team in ('A','B')),
  category        text not null check (category in ('inicial','avanzada')),
  user_id         uuid references auth.users(id) on delete set null,
  is_active       boolean not null default true,
  claimed_at      timestamptz,
  created_at      timestamptz not null default now()
);

-- Una persona = un cupo por competencia. Un cupo = un usuario.
create unique index if not exists participants_one_claim_per_user
  on public.participants (competition_id, user_id)
  where user_id is not null;

create index if not exists participants_competition_idx
  on public.participants (competition_id);

-- ---------------------------------------------------------------------
-- 4. Metas por semana (override manual + escalado automático)
--    Si no hay fila para una semana, se usa la meta base de la categoría.
-- ---------------------------------------------------------------------
create table if not exists public.participant_goals (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid not null references public.competitions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  week_number     int  not null check (week_number >= 1),
  goal            int  not null check (goal >= 1),
  source          text not null default 'auto' check (source in ('auto','manual')),
  created_at      timestamptz not null default now(),
  unique (participant_id, week_number)
);

-- ---------------------------------------------------------------------
-- 5. Deportes (catálogo editable por el admin)
-- ---------------------------------------------------------------------
create table if not exists public.sports (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  -- Duración mínima sugerida. Informativa: no se guarda en el registro.
  reference   text,
  sort_order  int  not null default 100,
  is_active   boolean not null default true
);

-- ---------------------------------------------------------------------
-- 6. Registros de entrenamiento
-- ---------------------------------------------------------------------
create table if not exists public.workouts (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid not null references public.competitions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  week_number     int  not null check (week_number >= 1),
  day_of_week     int  not null check (day_of_week between 1 and 7), -- 1 = lunes
  sport           text not null,
  note            text,
  photo_urls      text[] not null default '{}',
  created_at      timestamptz not null default now(),
  -- Al menos una foto y como máximo tres, para que el registro sea auditable.
  constraint workouts_photos_required
    check (coalesce(array_length(photo_urls, 1), 0) between 1 and 3)
);

create index if not exists workouts_competition_week_idx
  on public.workouts (competition_id, week_number);
create index if not exists workouts_participant_idx
  on public.workouts (participant_id, week_number);

-- Tope de registros por semana (max_weekly de la competencia)
create or replace function public.enforce_weekly_cap()
returns trigger
language plpgsql
as $$
declare
  cap  int;
  used int;
begin
  select max_weekly into cap
    from public.competitions where id = new.competition_id;

  select count(*) into used
    from public.workouts
   where participant_id = new.participant_id
     and week_number    = new.week_number;

  if used >= cap then
    raise exception 'Ya alcanzaste el máximo de % entrenamientos para esta semana.', cap;
  end if;

  return new;
end;
$$;

drop trigger if exists workouts_weekly_cap on public.workouts;
create trigger workouts_weekly_cap
  before insert on public.workouts
  for each row execute function public.enforce_weekly_cap();

-- ---------------------------------------------------------------------
-- 7. Comodines
-- ---------------------------------------------------------------------
create table if not exists public.wildcards (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid not null references public.competitions(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  week_number     int  not null check (week_number >= 1),
  reason          text,
  -- Otorgado por el administrador: no consume el cupo de la temporada.
  is_admin_grant  boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (participant_id, week_number)
);

create index if not exists wildcards_competition_idx
  on public.wildcards (competition_id, week_number);

-- Tope de comodines por temporada
create or replace function public.enforce_wildcard_cap()
returns trigger
language plpgsql
as $$
declare
  cap  int;
  used int;
begin
  if new.is_admin_grant then
    return new;
  end if;

  select wildcards_per_person into cap
    from public.competitions where id = new.competition_id;

  select count(*) into used
    from public.wildcards
   where participant_id = new.participant_id
     and is_admin_grant = false;

  if used >= cap then
    raise exception 'Ya usaste tus % comodín(es) de la temporada.', cap;
  end if;

  return new;
end;
$$;

drop trigger if exists wildcards_cap on public.wildcards;
create trigger wildcards_cap
  before insert on public.wildcards
  for each row execute function public.enforce_wildcard_cap();

-- =====================================================================
-- ROW LEVEL SECURITY
-- Lectura: cualquier usuario autenticado (la competencia es transparente).
-- Escritura: solo sobre el cupo que la persona reclamó.
-- El panel de administración escribe con service_role, que ignora RLS.
-- =====================================================================
alter table public.profiles           enable row level security;
alter table public.competitions       enable row level security;
alter table public.participants       enable row level security;
alter table public.participant_goals  enable row level security;
alter table public.sports             enable row level security;
alter table public.workouts           enable row level security;
alter table public.wildcards          enable row level security;

-- profiles
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated using (id = auth.uid());

-- competitions (solo lectura para usuarios)
drop policy if exists competitions_read on public.competitions;
create policy competitions_read on public.competitions
  for select to authenticated using (true);

-- sports (solo lectura)
drop policy if exists sports_read on public.sports;
create policy sports_read on public.sports
  for select to authenticated using (true);

-- participant_goals (solo lectura)
drop policy if exists goals_read on public.participant_goals;
create policy goals_read on public.participant_goals
  for select to authenticated using (true);

-- participants: todos leen
drop policy if exists participants_read on public.participants;
create policy participants_read on public.participants
  for select to authenticated using (true);

-- participants: reclamar un cupo libre
drop policy if exists participants_claim on public.participants;
create policy participants_claim on public.participants
  for update to authenticated
  using (user_id is null and is_active = true)
  with check (user_id = auth.uid());

-- participants: editar el cupo propio (apodo, avatar, nombre)
drop policy if exists participants_update_own on public.participants;
create policy participants_update_own on public.participants
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- workouts: todos leen (auditable)
drop policy if exists workouts_read on public.workouts;
create policy workouts_read on public.workouts
  for select to authenticated using (true);

-- workouts: solo registro propio
drop policy if exists workouts_insert_own on public.workouts;
create policy workouts_insert_own on public.workouts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.participants p
       where p.id = participant_id
         and p.user_id = auth.uid()
         and p.is_active = true
    )
  );

drop policy if exists workouts_delete_own on public.workouts;
create policy workouts_delete_own on public.workouts
  for delete to authenticated
  using (
    exists (
      select 1 from public.participants p
       where p.id = participant_id
         and p.user_id = auth.uid()
    )
  );

-- wildcards
drop policy if exists wildcards_read on public.wildcards;
create policy wildcards_read on public.wildcards
  for select to authenticated using (true);

drop policy if exists wildcards_insert_own on public.wildcards;
create policy wildcards_insert_own on public.wildcards
  for insert to authenticated
  with check (
    exists (
      select 1 from public.participants p
       where p.id = participant_id
         and p.user_id = auth.uid()
         and p.is_active = true
    )
  );

-- =====================================================================
-- STORAGE: buckets para fotos
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('workout-photos', 'workout-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "lectura publica fotos" on storage.objects;
create policy "lectura publica fotos" on storage.objects
  for select using (bucket_id in ('workout-photos','avatars'));

drop policy if exists "subida autenticada fotos" on storage.objects;
create policy "subida autenticada fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('workout-photos','avatars'));

-- =====================================================================
-- CATÁLOGO DE DEPORTES INICIAL (reemplazable desde el panel admin)
-- =====================================================================
insert into public.sports (name, reference, sort_order) values
  ('Baile / Zumba',           '40 min',              10),
  ('Básquetbol / Vóleibol',   '40 min',              20),
  ('Boxeo / Artes Marciales', '40 min',              30),
  ('Calistenia / Barras',     '45 min',              40),
  ('Cerro / Trekking',        '45 min',              50),
  ('Ciclismo Ruta',           '40 min',              60),
  ('CrossFit',                '45 min',              70),
  ('Elíptica / Escaladora',   '45 min',              80),
  ('Escalada / Boulder',      '60 min',              90),
  ('Funcional / HIIT',        '40 min',             100),
  ('Fútbol',                  '40 min',             110),
  ('Gimnasio (Pesas)',        '45 min',             120),
  ('Kayak / SUP / Remo',      '40 min',             130),
  ('Mountainbike',            '40 min',             140),
  ('Pádel / Tenis',           '40 min',             150),
  ('Pilates Reformer',        '40 min',             160),
  ('Remo (Máquina)',          '30 min',             170),
  ('Ski / Snowboard',         '2 horas de jornada', 180),
  ('Spinning',                '40 min',             190),
  ('Surf',                    '45 min en el agua',  200)
on conflict (name) do nothing;
