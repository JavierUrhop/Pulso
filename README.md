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

## Identidad visual

**Colores.** Azul marino (`navy`) para la interfaz, rojo para el Equipo A y azul para el Equipo B, verde para lo que supera la meta. Todo vive en `tailwind.config.ts`; cambiar un equipo de color es una línea.

**Tipografía.** Los títulos usan la clase `.display`: condensada, en mayúsculas, tipo camiseta deportiva. La pila de fuentes empieza por Barlow Condensed y cae en Arial Narrow, que ya existe en Windows y Mac. Si quieres la fuente exacta en todos los dispositivos, agrega en `layout.tsx`:

```ts
import { Barlow_Condensed } from 'next/font/google';
const display = Barlow_Condensed({ subsets: ['latin'], weight: ['600','700','800'], variable: '--font-display' });
```

y suma `${display.variable}` a la clase del `<html>`, más `'var(--font-display)'` al inicio de `fontFamily.display` en Tailwind.

**Íconos.** Se generan todos desde una sola imagen:

```bash
python3 scripts/generate-icons.py
```

Lee `assets/icon-master.png` y produce en `public/`: `apple-touch-icon.png` (iPhone), `icon-192.png` e `icon-512.png` (Android/PWA), `favicon-32.png` (pestaña) y `og-image.png` (vista previa al compartir). Para cambiar el ícono, reemplaza el archivo maestro por otro cuadrado de 1024×1024 y vuelve a correr el script.
