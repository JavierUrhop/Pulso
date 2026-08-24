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

Cada persona registra solo los suyos, eligiendo cuándo entrenó, el deporte y **entre 1 y 3 fotos** de respaldo, que pueden venir de la cámara o de la galería. La foto es obligatoria: sin ella el registro no se guarda.

**Ventana de 24 horas.** Solo se puede anotar el entrenamiento de **hoy o el de ayer**. El formulario ofrece esas dos opciones y nada más, así que no hay que elegir el día de una lista de siete.

El caso interesante es el lunes: "ayer" fue domingo, que pertenece a la semana anterior y ya está cerrada. La opción viene con su semana ya resuelta y avisa en pantalla que el registro contará para esa semana, no para la nueva. Lo mismo aplica al editar: la fecha solo se puede mover dentro de esas 24 horas, aunque el deporte, la nota y las fotos se pueden corregir después sin plazo.

La regla se valida también en la base de datos (`workout_is_recent`), porque de otro modo bastaría con enviar otros valores desde el navegador para saltarla.

Cada deporte del catálogo trae una duración de referencia (por ejemplo, 40 min para fútbol). Es informativa y se muestra al elegirlo, pero no se guarda en el registro ni afecta el puntaje.

Si el deporte no está en la lista, se elige **Otro** y se escribe. Queda guardado en el catálogo para todos y aparece desde ese momento en la pestaña Deportes.

Cada persona puede **editar o eliminar** sus propios registros desde su bitácora: cambiar el día, el deporte, la nota o las fotos. Al eliminar se pide confirmación explícita, porque implica perder el punto de esa sesión.

### Fotos y almacenamiento

Las fotos se comprimen en el teléfono **antes** de subirse: se reducen a 1280 px de lado mayor y se guardan como JPEG de calidad 0.8. Una foto de celular baja de unos 3 MB a entre 200 y 350 KB, sin que se note en pantalla.

Sin comprimir, un caso extremo (15 personas × 6 entrenamientos × 3 fotos × 8 semanas = 2.160 fotos) ocuparía más de 6 GB. Comprimidas quedan en torno a 550 MB, dentro del gigabyte que da el plan gratuito de Supabase Storage. Conviene igual revisar el consumo real en **Supabase → Settings → Usage**, porque los planes cambian.

Los parámetros están en `src/lib/image.ts` (`MAX_SIDE` y `QUALITY`) si quieres apretar más o menos.

### Logros

Cada semana en que alguien alcanza su meta gana una medalla, y hay dos niveles que se distinguen por color, ícono y forma:

| Nivel | Color | Ícono | Cuándo |
|---|---|---|---|
| Meta cumplida | Carmesí | Ticket ✓ | Llegó a su meta |
| Meta superada | Ciruela, con halo | Doble flecha ↑↑ | La superó en uno o más |

**Superar la meta da las dos medallas**, porque para superarla primero hay que cumplirla. Una semana justa en la meta da una; una semana por encima da dos.

Las mismas dos insignias aparecen en el marcador junto a cada persona, apagadas en gris punteado mientras no se consiguen. Se ven siempre, para que quede claro qué hay por ganar.

### Salón de trofeos

El perfil de cada persona reúne lo conseguido en **todas** las competencias donde participa: entrenamientos totales, medallas por nivel, el detalle de cada medalla con su semana y fechas, y el histórico de deportes.

Ese histórico muestra qué practica cada uno, ordenado de más a menos, con una barra proporcional y el porcentaje sobre el total. Aparece sumando todas las competencias arriba, y desglosado dentro de cada una.

Es público dentro de la aplicación: desde la ficha de cualquier integrante hay un botón **Ver perfil**, así que todos pueden mirar los trofeos del resto. Vive en `/u/<id de usuario>`, fuera de la competencia, porque agrupa varias.

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
    login/          ← registro, alta y recuperación de contraseña
    recuperar/      ← definir contraseña nueva desde el enlace del correo
    u/[uid]/        ← salón de trofeos público de cualquier integrante
    page.tsx        ← competencias activas
    c/[id]/
      page.tsx        ← marcador: consolidado por defecto, filtro por semana
      asignarme/      ← reclamar tu cupo (se bloquea al elegirlo)
      yo/             ← salón de trofeos propio + ajustes
      yo/editar/      ← nombre, apodo y avatar
      registrar/      ← formulario de entrenamiento
      p/[pid]/        ← detalle de una persona con bitácora y fotos
      w/[wid]/        ← editar o eliminar un entrenamiento propio
      temporada/      ← acumulado, gráfico y ranking
      deportes/       ← marcador global: qué deporte hace cada equipo
    admin/
      page.tsx        ← clave compartida + crear competencias
      [id]/           ← integrantes, reglas, metas manuales, registros
      deportes/       ← catálogo del desplegable
  components/
    Achievements.tsx  ← insignias y medallas
    TrophyRoom.tsx    ← perfil de logros, propio o de otro
    TabBar.tsx        ← navegación inferior con respuesta inmediata
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
node scripts/test-scoring.mjs && node scripts/run-tests.mjs   # 32 casos de puntaje
node scripts/test-week.mjs                                    # 11 casos de fechas
node scripts/test-trophies.mjs                                # 7 casos de medallas
node scripts/test-window.mjs                                  # 14 casos de la ventana de 24 h
```

El primero cubre bonos, topes, comodín, per cápita, escalado de metas, acumulado y la equivalencia entre el cálculo directo y el precalculado. El segundo cubre las semanas en horario de Chile, incluidos los domingos por la noche y el cambio de horario de verano. El tercero cubre la regla de la medalla doble y el conteo de deportes. El cuarto cubre la ventana de registro, con el lunes que arrastra el domingo anterior, el primer día de competencia y el horario de verano.

## Rendimiento

Las metas dependen del historial: para saber la meta de la semana 8 hay que recorrer las siete anteriores. Hecho de forma ingenua, armar el marcador cuesta al cuadrado en el número de semanas, y con veinte personas eso se nota al navegar.

`createScoringContext()` calcula una sola vez la tabla de metas y el conteo de entrenamientos por persona y semana; el resto de las pantallas la reutiliza. Además cada ruta tiene su `loading.tsx`, y la barra inferior marca la pestaña tocada de inmediato con una barra de progreso, en vez de quedarse quieta esperando al servidor.

## Panel de administración

Además de crear competencias y armar los equipos, permite:

- **Foto de portada** por competencia, visible en el listado y detrás del marcador
- **Metas manuales** por persona a partir de una semana concreta
- **Comodines otorgados**, que no consumen el cupo de la persona
- **Corregir la numeración de semanas**, con dos métodos: recalcular según la fecha real de cada registro, o desplazar todas las semanas en bloque
- **Eliminar una competencia** completa, escribiendo su nombre para confirmar

### Si las semanas quedaron corridas

Hay **dos cosas distintas** que pueden estar desalineadas, y conviene arreglarlas en este orden:

1. **La fecha de inicio de la competencia**, que define qué rango cubre cada semana. Se ajusta en la sección **Calendario** del panel, con su propio botón. Ahí mismo se ve el rango de la semana 1 y cuál es la semana en curso.
2. **El número de semana de cada registro**, que quedó grabado al momento de guardarlo y no se mueve solo al cambiar la fecha. Se corrige abajo, en **Corregir numeración de registros**.

Si el encabezado de la app muestra un rango de fechas equivocado (por ejemplo "Semana 1 · 10 ago – 16 ago" cuando querías partir el 17), el problema es el punto 1, no el 2.

Después de corregir la fecha, **Recalcular según la fecha de cada registro** es la opción más segura: recalcula cada uno a partir de cuándo se guardó. **Desplazar** conviene solo si sabes que todos los registros están corridos la misma cantidad, y no debe usarse dos veces seguidas.

## Salón de trofeos

El perfil de cada persona reúne lo conseguido en **todas** las competencias donde participa, no solo en la actual. Muestra entrenamientos totales, medallas y, por competencia, un desglose con equipo, semanas, comodines y deporte más repetido.

Hay dos medallas, una por semana:

| Medalla | Cuándo se gana | Color |
|---|---|---|
| ★ Meta cumplida | La semana termina con los entrenamientos justos de la meta | Carmesí |
| ✦ Meta superada | Se supera la meta en uno o más entrenamientos | Ciruela |

Cada medalla guarda la semana y su rango de fechas. Una semana con comodín no genera medalla.

En el marcador y en la ficha de cada persona aparecen además unas **insignias tipo semáforo**: se ven siempre, apagadas y con borde punteado, y se encienden al conseguirse. La idea es que se vea qué hay por ganar antes de ganarlo.

Se llega al perfil desde la pestaña Perfil (el propio) o con el botón **Ver perfil** en la ficha de cualquier integrante. La ruta es `/u/<id de usuario>`.

## Rendimiento

Dos cosas hacían que la app se sintiera trabada al cambiar de pestaña:

1. **El cálculo crecía al cuadrado.** Deducir la meta de una semana implicaba recorrer todas las anteriores, y eso se repetía por persona y por semana. Ahora `createScoringContext` arma en una sola pasada la tabla de metas y el conteo de entrenamientos, y las pantallas la reutilizan.
2. **No había respuesta visual inmediata.** Cada pestaña espera al servidor, así que se agregaron esqueletos de carga (`loading.tsx`) y la barra inferior marca al instante la pestaña tocada, con una línea de progreso mientras llega la pantalla.

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
