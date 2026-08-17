-- =====================================================================
-- Pulso · Migración 003 — deportes agregados por los participantes
--
-- Ejecutar UNA VEZ en Supabase → SQL Editor, después de 002_mejoras.sql.
--
-- Permite que, al registrar un entrenamiento, alguien elija "Otro" y
-- escriba un deporte que no está en el catálogo. El deporte queda
-- guardado y disponible para todos de ahí en adelante.
--
-- Se hace con una función security definer en vez de abrir la tabla a
-- escritura: así el único cambio posible es agregar un nombre, y nadie
-- puede borrar ni renombrar el catálogo desde la aplicación.
-- =====================================================================

begin;

-- Comparación tolerante a tildes sin depender de la extensión unaccent.
create or replace function public.unaccent_safe(txt text)
returns text
language sql
immutable
as $$
  select translate(
    coalesce(txt, ''),
    'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
    'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
  );
$$;

create or replace function public.add_sport(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name    text;
  v_existing text;
begin
  v_name := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));

  if length(v_name) < 3 then
    raise exception 'El nombre del deporte es muy corto.';
  end if;
  if length(v_name) > 40 then
    raise exception 'El nombre del deporte es muy largo.';
  end if;

  -- Si ya existe (sin importar mayúsculas ni tildes), se reutiliza.
  select name into v_existing
    from public.sports
   where lower(unaccent_safe(name)) = lower(unaccent_safe(v_name))
   limit 1;

  if v_existing is not null then
    update public.sports set is_active = true where name = v_existing;
    return v_existing;
  end if;

  -- sort_order 500 deja los agregados después del catálogo base.
  -- La aplicación igual los ordena alfabéticamente al mostrarlos.
  insert into public.sports (name, sort_order, is_active)
  values (v_name, 500, true);

  return v_name;
end;
$$;

grant execute on function public.add_sport(text) to authenticated;
grant execute on function public.unaccent_safe(text) to authenticated;

commit;
