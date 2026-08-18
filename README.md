# Pulso

Competencia deportiva por equipos con registro auditable de entrenamientos.

Next.js 14 · Supabase · Vercel

Para montarlo, sigue [SETUP.md](./SETUP.md).

---

## Cómo funciona la competencia

**Equipos y metas son cosas distintas.** Equipo A y Equipo B compiten entre sí. La *meta inicial* y la *meta avanzada* definen cuántos entrenamientos por semana necesita cada persona. Un equipo mezcla ambas, así queda parejo.

**Las semanas van de lunes a domingo, en horario de Chile.** La semana 1 corre del lunes 00:00 al domingo 23:59 (`America/Santiago`), incluso si la fecha de inicio cae a mitad de semana. Todo el cálculo usa esa zona horaria, así que un domingo por la noche nunca se cuenta como lunes. La competencia dura la cantidad de semanas que fije el administrador.

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

El administrador puede otorgar comodines adicionales desde el panel, indicando la semana. Esos no consumen el cupo de la persona y quedan marcados como "Admin" en el listado, para que se note la diferencia.

### Registro de entrenamientos

Cada persona registra solo los suyos, eligiendo día, deporte y **entre 1 y 3 fotos** de respaldo, que pueden venir de la cámara o de la galería. La foto es obligatoria: sin ella el registro no se guarda.

Cada deporte del catálogo trae una duración de referencia (por ejemplo, 40 min para fútbol). Es informativa y se muestra al elegirlo, pero no se guarda en el registro ni afecta el puntaje.

Si el deporte no está en la lista, se elige **Otro** y se escribe. Queda guardado en el catálogo para todos y aparece desde ese momento en la pestaña Deportes.

Cada persona puede **editar o eliminar** sus propios registros desde su bitácora: cambiar el día, el deporte, la nota o las fotos. Al eliminar se pide confirmación explícita, porque implica perder el punto de esa sesión.

### Fotos y almacenamiento

Las fotos se comprimen en el teléfono **antes** de subirse: se reducen a 1280 px de lado mayor y se guardan como JPEG de calidad 0.8. Una foto de celular baja de unos 3 MB a entre 200 y 350 KB, sin que se note en pantalla.

Sin comprimir, un caso extremo (15 personas × 6 entrenamientos × 3 fotos × 8 semanas = 2.160 fotos) ocuparía más de 6 GB. Comprimidas quedan en torno a 550 MB, dentro del gigabyte que da el plan gratuito de Supabase Storage. Conviene igual revisar el consumo real en **Supabase → Settings → Usage**, porque los planes cambian.

Los parámetros están en `src/lib/image.ts` (`MAX_SIDE` y `QUALITY`) si quieres apretar más o menos.

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
      page.tsx        ← marcador: consolidado por defecto, filtro por semana
      asignarme/      ← reclamar tu cupo (se bloquea al elegirlo)
      yo/             ← editar nombre, apodo y avatar
      registrar/      ← formulario de entrenamiento
      p/[pid]/        ← detalle de una persona con bitácora y fotos
      temporada/      ← acumulado, gráfico y ranking
      deportes/       ← marcador global: qué deporte hace cada equipo
    admin/
      page.tsx        ← clave compartida + crear competencias
      [id]/           ← integrantes, reglas, metas manuales, registros
      deportes/       ← catálogo del desplegable
  components/
supabase/
  schema.sql        ← instalación desde cero
  migrations/       ← cambios sobre una base que ya está en producción
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
node scripts/test-scoring.mjs && node scripts/run-tests.mjs   # 24 casos de puntaje
node scripts/test-week.mjs                                    # 11 casos de fechas
```

El primero cubre bonos, topes, comodín, per cápita, escalado de metas y acumulado. El segundo cubre el cálculo de semanas en horario de Chile, incluidos los domingos por la noche y el cambio de horario de verano.

## Panel de administración

Además de crear competencias y armar los equipos, permite:

- **Foto de portada** por competencia, visible en el listado y detrás del marcador
- **Metas manuales** por persona a partir de una semana concreta
- **Comodines otorgados**, que no consumen el cupo de la persona
- **Corregir la numeración de semanas**, con dos métodos: recalcular según la fecha real de cada registro, o desplazar todas las semanas en bloque
- **Eliminar una competencia** completa, escribiendo su nombre para confirmar

### Si las semanas quedaron corridas

Pasa cuando la competencia se creó con una fecha de inicio de la semana anterior: los registros guardan el número de semana calculado en ese momento. Para arreglarlo:

1. En el panel de la competencia, corrige la **fecha de inicio** al lunes correcto y guarda
2. Usa **Recalcular según la fecha de cada registro**, o bien **Desplazar** con −1 si prefieres mover todo en bloque

El formulario de creación ahora propone por defecto el lunes de la semana en curso y muestra explícitamente qué rango cubre la semana 1, para que no vuelva a ocurrir.

## Ajustes de la aplicación

En **Perfil → engranaje** cada persona puede cambiar el tamaño del texto, con cuatro presets y un control fino de 85% a 140%. Toda la interfaz usa `rem`, así que la escala mueve texto y espaciado de forma proporcional. El valor se guarda en el dispositivo y se aplica antes del primer pintado, para que no salte al cargar.

## Actualizar una base que ya está en producción

`schema.sql` sirve para instalar desde cero. Si la competencia ya está andando con datos reales, corre en su lugar los archivos de `supabase/migrations/` en orden, una sola vez cada uno, desde el SQL Editor de Supabase.

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
