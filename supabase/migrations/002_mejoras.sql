-- =====================================================================
-- Pulso · Migración 002 — mejoras funcionales
--
-- Ejecutar UNA VEZ en Supabase → SQL Editor sobre la base que ya está
-- en producción. No borra datos: renombra columnas, agrega campos y
-- reemplaza el catálogo de deportes.
--
-- Cambios:
--   1. Metas "sedentario/avanzado" pasan a llamarse "inicial/avanzada"
--   2. Las competencias tienen duración en semanas
--   3. Un entrenamiento guarda hasta 3 fotos (obligatorio al menos 1)
--   4. Los deportes traen un tiempo de referencia
--   5. El administrador puede otorgar comodines por sobre el límite
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Metas: inicial / avanzada
-- ---------------------------------------------------------------------
alter table public.competitions rename column goal_sedentario to goal_initial;
alter table public.competitions rename column goal_avanzado  to goal_advanced;

-- Las categorías de las personas cambian de nombre junto con las metas.
alter table public.participants drop constraint if exists participants_category_check;

update public.participants
   set category = case category
                    when 'sedentario' then 'inicial'
                    when 'avanzado'   then 'avanzada'
                    else category
                  end;

alter table public.participants
  add constraint participants_category_check
  check (category in ('inicial', 'avanzada'));

-- ---------------------------------------------------------------------
-- 2. Duración de la competencia
--    La semana 1 va del lunes 00:00 al domingo 23:59 (hora de Chile).
-- ---------------------------------------------------------------------
alter table public.competitions
  add column if not exists total_weeks int not null default 12
  check (total_weeks between 1 and 52);

comment on column public.competitions.total_weeks is
  'Cantidad de semanas que dura la competencia, contadas desde start_date.';

-- ---------------------------------------------------------------------
-- 3. Fotos: hasta 3 por entrenamiento, al menos 1
-- ---------------------------------------------------------------------
alter table public.workouts
  add column if not exists photo_urls text[] not null default '{}';

-- Traslada las fotos existentes al nuevo formato.
update public.workouts
   set photo_urls = array[photo_url]
 where photo_url is not null
   and coalesce(array_length(photo_urls, 1), 0) = 0;

-- NOT VALID: exige fotos solo en los registros nuevos, sin invalidar
-- los antiguos que se crearon cuando la foto era opcional.
alter table public.workouts drop constraint if exists workouts_photos_required;
alter table public.workouts
  add constraint workouts_photos_required
  check (coalesce(array_length(photo_urls, 1), 0) between 1 and 3)
  not valid;

-- ---------------------------------------------------------------------
-- 4. Comodines otorgados por el administrador
--    Estos no consumen el cupo de la temporada.
-- ---------------------------------------------------------------------
alter table public.wildcards
  add column if not exists is_admin_grant boolean not null default false;

create or replace function public.enforce_wildcard_cap()
returns trigger
language plpgsql
as $$
declare
  cap  int;
  used int;
begin
  -- Un comodín otorgado por el administrador no cuenta contra el tope.
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

-- ---------------------------------------------------------------------
-- 5. Catálogo de deportes con tiempo de referencia
-- ---------------------------------------------------------------------
alter table public.sports
  add column if not exists reference text;

comment on column public.sports.reference is
  'Duración mínima sugerida. Es informativa: no se guarda en el registro.';

-- Se reemplaza el catálogo. Los entrenamientos ya registrados guardan el
-- nombre del deporte como texto, así que el historial no se ve afectado.
delete from public.sports;

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
on conflict (name) do update
  set reference  = excluded.reference,
      sort_order = excluded.sort_order,
      is_active  = true;

commit;
