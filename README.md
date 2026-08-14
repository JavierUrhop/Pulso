# Pulso

Competencia deportiva por equipos con registro auditable de entrenamientos.

Next.js 14 · Supabase · Vercel

Para montarlo, sigue [SETUP.md](./SETUP.md).

---

## Cómo funciona la competencia

**Equipos y categorías son cosas distintas.** Equipo A y Equipo B compiten entre sí. Sedentario y avanzado definen la meta semanal de cada persona. Un equipo mezcla ambas categorías, así queda parejo.

### Puntaje semanal por persona

| Concepto | Puntos |
|---|---|
| Cada entrenamiento registrado | +1 (tope 6 por semana) |
| Alcanzar la meta semanal | +2 |
| Superar la meta en 1 o más | +1 |
| Todo el equipo alcanza su meta | +5 a cada integrante |

### Puntaje del equipo

Se suman los puntos de todos los integrantes que cuentan esa semana y se divide por cuántos son. Así un equipo con más gente no gana por volumen, y una lesión no hunde el promedio.

### Comodín

Uno por persona en toda la temporada. Quien lo usa queda fuera del cálculo de esa semana: no suma, no resta, y no rompe el bono de equipo completo.

### Escalado de metas

Si alguien iguala **exactamente** su meta durante 3 semanas seguidas, la meta sube en 1 a la semana siguiente. Superarla no cuenta para la racha, solo igualarla. El administrador también puede fijar metas a mano.

> La racha se calcula **por persona**, no por categoría. Si prefieres que suba para toda una categoría a la vez, se cambia en `goalFor()` dentro de `src/lib/scoring.ts`.

---

## Estructura

```
src/
  lib/
    scoring.ts      ← todas las reglas de puntaje viven aquí
    week.ts         ← cálculo de semanas (lunes a domingo)
    data.ts         ← carga el estado completo de una competencia
    types.ts
    supabase/       ← clientes de navegador, servidor y admin
  app/
    login/          ← registro e inicio de sesión
    page.tsx        ← competencias activas
    c/[id]/
      page.tsx        ← marcador Equipo A vs Equipo B
      asignarme/      ← reclamar tu cupo (se bloquea al elegirlo)
      yo/             ← editar nombre, apodo y avatar
      registrar/      ← formulario de entrenamiento
      p/[pid]/        ← detalle de una persona con bitácora y fotos
      temporada/      ← acumulado, gráfico y ranking
    admin/
      page.tsx        ← clave compartida + crear competencias
      [id]/           ← integrantes, reglas, metas manuales, registros
      deportes/       ← catálogo del desplegable
  components/
supabase/
  schema.sql        ← tablas, RLS, triggers, buckets y deportes iniciales
```

## Seguridad

Las reglas viven en la base de datos (RLS), no solo en la interfaz:

- Cada persona solo puede insertar entrenamientos de su propio cupo
- Un cupo reclamado no puede ser tomado por nadie más
- El tope de 6 entrenamientos y el de 1 comodín son triggers en Postgres
- Lectura abierta a cualquier participante autenticado, para que sea auditable
- El panel de administración usa `service_role` desde el servidor, nunca desde el navegador

## Probar las reglas

```bash
node scripts/test-scoring.mjs && node scripts/run-tests.mjs
```

Cubre 24 casos: bonos, topes, comodín, per cápita, escalado de metas y acumulado.

## Ideas para después

- Notificación el domingo a quien va debajo de su meta
- Exportar la temporada a planilla
- Historial de rachas y récords personales
- Roles reales por cuenta en vez de clave compartida (ver el final de SETUP.md)
