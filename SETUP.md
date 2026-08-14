# Paso a paso para montar la app

Tiempo estimado: 30–40 minutos la primera vez.

---

## Parte 1 — Supabase (base de datos)

**1. Crear el proyecto**
- Entra a [supabase.com](https://supabase.com) → **New project**
- Nombre: `pulso`
- Región: elige **South America (São Paulo)**, la más cercana a Chile
- Guarda la contraseña de la base de datos en tu gestor de contraseñas

**2. Crear las tablas**
- En el menú lateral: **SQL Editor** → **New query**
- Abre el archivo `supabase/schema.sql` de este proyecto, copia **todo** el contenido y pégalo
- Presiona **Run**
- Deberías ver "Success. No rows returned". Si sale un error, cópialo y lo revisamos

**3. Desactivar la confirmación por correo** (recomendado para uso interno)
- **Authentication** → **Sign In / Providers** → **Email**
- Desactiva **Confirm email** y guarda
- Sin esto, cada persona tendrá que abrir un correo antes de poder entrar

**4. Copiar las tres llaves**
- **Project Settings** → **API**
- Anota estos tres valores, los vas a necesitar en la parte 3:

| Dónde aparece | Para qué sirve |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

> La llave `service_role` salta todas las reglas de seguridad. Nunca la pongas en el navegador ni la subas a GitHub.

**5. Verificar los buckets de fotos**
- **Storage** → deberías ver `workout-photos` y `avatars` ya creados por el script
- Si no aparecen, vuelve a correr la sección `STORAGE` del `schema.sql`

---

## Parte 2 — GitHub (código)

**1. Crear el repositorio**
- En GitHub: **New repository** → nombre `pulso` → **Private**
- No marques "Add a README" (ya viene uno en el proyecto)

**2. Subir el código**

Desde la carpeta del proyecto en tu computador:

```bash
git init
git add .
git commit -m "Pulso: versión inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/pulso.git
git push -u origin main
```

> El `.gitignore` ya excluye `.env.local` y `node_modules`, así que tus llaves no se suben.

**3. Probar en tu computador antes de publicar** (opcional pero recomendado)

```bash
npm install
cp .env.example .env.local
# abre .env.local y pega las llaves de la parte 1
npm run dev
```

Abre `http://localhost:3000`.

---

## Parte 3 — Vercel (publicación)

**1. Importar el proyecto**
- [vercel.com](https://vercel.com) → **Add New** → **Project**
- Conecta tu cuenta de GitHub e importa `pulso`
- Framework: Vercel detecta **Next.js** solo, no cambies nada

**2. Cargar las variables de entorno**

Antes de presionar Deploy, abre **Environment Variables** y agrega las cuatro:

| Nombre | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | el Project URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la llave `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | la llave `service_role` |
| `ADMIN_PASSCODE` | `2218` |

**3. Deploy**
- Presiona **Deploy** y espera 1–2 minutos
- Vercel te da una URL tipo `https://pulso.vercel.app`

**4. Autorizar la URL en Supabase**
- Vuelve a Supabase → **Authentication** → **URL Configuration**
- En **Site URL** pega la URL de Vercel
- En **Redirect URLs** agrega `https://tu-url.vercel.app/**`

De aquí en adelante, cada `git push` a `main` republica la app automáticamente.

---

## Parte 4 — Dejar la competencia lista

1. Entra a tu URL de Vercel y **crea tu cuenta** (correo + contraseña)
2. Abajo del listado, entra a **Panel de administración** e ingresa `2218`
3. **Nueva competencia**: ponle nombre, fecha de inicio y las metas base (2 y 3)
4. Entra a la competencia y **agrega a cada persona** con su equipo (A/B) y categoría
5. Ve a **Catálogo de deportes** y ajusta la lista con los deportes reales de tu grupo
6. Comparte la URL con el equipo

Cada persona: crea su cuenta → entra a la competencia → elige su nombre de la lista → sube su foto de perfil → empieza a registrar.

---

## Cosas que conviene saber

**La fecha de inicio define las semanas.** Las semanas van de lunes a domingo. La semana 1 es la que contiene la fecha de inicio, así que conviene poner un lunes.

**Los cupos se bloquean solos.** Si dos personas eligen el mismo nombre al mismo tiempo, solo la primera lo obtiene; la segunda ve un aviso para elegir otro. Si alguien se equivocó, tú puedes usar **Liberar cupo** en el panel.

**Nadie puede registrar por otro.** Las reglas de seguridad de la base (RLS) bloquean el intento incluso si alguien manipula la página.

**Todos ven todo.** Cualquier participante puede abrir el detalle y las fotos de cualquier otro. Es intencional: hace la competencia auditable.

**Ajustar metas a mano.** En el panel, cada persona tiene un campo "Desde semana / Meta". Eso fija la meta desde esa semana en adelante y reinicia el conteo de la racha.

---

## Sobre la clave compartida

Cualquiera que tenga `2218` puede editar metas, mover gente entre equipos y borrar registros. Para un grupo de trabajo está bien, pero si más adelante quieres control real por persona:

1. Agrega una columna `is_admin boolean default false` a `profiles`
2. Marca tu usuario con `update profiles set is_admin = true where email = 'tu@correo.cl'`
3. En `src/app/admin/actions.ts`, reemplaza el chequeo de la cookie por una consulta a esa columna
4. Agrega políticas RLS de escritura para admins, y deja de usar `service_role`

El resto de la app no cambia.

---

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| Redirige a `/login` en bucle | Falta configurar Site URL en Supabase |
| "Invalid API key" | Alguna variable quedó mal pegada en Vercel (revisa espacios al final) |
| El panel no acepta la clave | Falta `ADMIN_PASSCODE` en Vercel, o el deploy fue antes de agregarla |
| Las fotos no se ven | Los buckets no quedaron públicos; vuelve a correr la sección STORAGE |
| Cambié una variable y no pasa nada | Vercel requiere **Redeploy** después de cambiar variables |
