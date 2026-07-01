# PDP Laboratory

Password-protected product page viewer for MSC Industrial Supply Co. Built with Express, JWT authentication, and deployable to Vercel.

## Features

- Password-only login (no username)
- JWT-based authentication with HttpOnly cookies
- Protected product detail page (`pdp-cimsource-cam.html`)
- Same look & feel as the original MSC page
- Works locally and on Vercel (serverless)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express 5 |
| Auth | JWT (`jsonwebtoken`) |
| Cookies | `cookie-parser` |
| Dev | nodemon |
| Deploy | Vercel (serverless functions in `api/`) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
PASSWORD=your-secure-password
JWT_SECRET=your-random-secret
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PASSWORD` | Yes | The password required to access the product page |
| `JWT_SECRET` | No (has fallback) | Secret key used to sign JWT tokens. **Required in production.** |

### Run Locally

```bash
npm run dev     # with nodemon (auto-restart on changes)
# or
npm start       # without nodemon
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

### One-click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual Deploy

1. Push the repo to GitHub
2. Import the project in [Vercel Dashboard](https://vercel.com/new)
3. Add environment variables:
   - `PASSWORD`
   - `JWT_SECRET`
4. Deploy — Vercel auto-detects the `api/` folder and applies `vercel.json`

### How the Vercel deployment works

```
index.html (static)         → served by Vercel
api/login.js (serverless)   → handles POST /api/login
api/pdp.js (serverless)     → handles GET /pdp (via rewrite)
pdp-cimsource-cam.html      → served only through /pdp (rewrite blocks direct access)
```

## Project Structure

```
msc-pdp-cimsource-cam/
├── .env                     # Environment variables (gitignored)
├── vercel.json              # Vercel rewrites configuration
├── server.js                # Local development server
├── index.html               # Login page (password-only form)
├── pdp-cimsource-cam.html   # MSC product page (protected)
├── css/
│   └── index.css            # Login page styles
├── api/
│   ├── login.js             # Vercel serverless: login endpoint
│   └── pdp.js               # Vercel serverless: serve protected page
├── assets/                  # Static assets (images, CSS, JS from MSC)
└── package.json
```

## Sistema de logging de accesos (a retirar)

> **⚠️ Este feature será eliminado en una fase posterior del desarrollo.**
> Los segmentos de código están marcados con `[LOGIN DETECTOR - A RETIRAR]`.

### Descripción

Cada vez que un usuario autenticado visita la página protegida `/pdp`, el sistema registra la visita en la base de datos mediante la función `logAccess()`. Esto permite auditar qué usuarios (por IP/dispositivo) acceden a la página y cuándo.

### ¿Qué se registra?

| Campo | Descripción |
|-------|-------------|
| `ip` | Dirección IP del cliente (o `X-Forwarded-For` tras proxy) |
| `userAgent` | Cabecera `User-Agent` del navegador (máx. 500 chars) |
| `referer` | Cabecera `Referer` de la solicitud (máx. 1000 chars) |
| `language` | Cabecera `Accept-Language` del navegador |
| `fingerprint` | SHA-256 de `{ip}|{userAgent}` — identificador semianónimo del dispositivo |
| `page` | Ruta de la página visitada (por defecto `/pdp`) |
| `createdAt` | Marca de tiempo del acceso |

### Arquitectura

```
                     logAccess()
  Usuario autenticado ──────────► Prisma ──► PostgreSQL (neon.tech)
                                       ▲
                                  ┌────┴────┐
                                  │ AccessLog │
                                  └─────────┘
```

### Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `server.js:48-65` | Función `logAccess()` para el servidor local Express |
| `server.js:32-42` | Middleware `requireAuth()` — detector de sesión JWT |
| `server.js:70-73` | Redirige a `/?success=1` tras login exitoso |
| `api/pdp.js:24-41` | Función `logAccess()` para el despliegue serverless en Vercel |
| `api/pdp.js:14-22` | Helper `parseCookies()` — parsea cookies sin cookie-parser |
| `api/login.js:18` | Firma del JWT — genera el token que luego se detecta |
| `api/login.js:23` | Redirige a `/?success=1` tras login exitoso (Vercel) |
| `index.html:19` | Mensaje "login Successfully" que se muestra con `?success=1` |
| `index.html:35-39` | JS que bloquea el input y redirige a `/pdp` al mostrar el éxito |
| `css/index.css:89-98` | Estilos del mensaje `.success-msg` (verde, oculto por defecto) |
| `prisma/schema.prisma:9-18` | Modelo `AccessLog` — definición de la tabla en la BD |

### Flujo completo

1. El usuario ingresa la contraseña en `/` → `POST /api/login`
2. El servidor valida la contraseña y firma un JWT con `jwt.sign()`
3. El JWT se almacena en una cookie HttpOnly (`token`)
4. El servidor redirige a `/?success=1` en vez de directamente a `/pdp`
5. La login page muestra el mensaje "login Successfully", bloquea el input de password y redirige inmediatamente a `/pdp`
6. En cada request a `/pdp` o `/api/pdp`, el middleware `requireAuth()` (o la verificación inline en `api/pdp.js`) extrae y verifica el JWT
7. Si el token es válido, se llama a `logAccess()` que persiste los datos del request en la tabla `AccessLog`
8. Si el token falta o es inválido, se redirige a `/` (login)

### ¿Qué se eliminará?

- La función `logAccess()` en ambos archivos (`server.js`, `api/pdp.js`)
- El middleware `requireAuth()` — se reemplazará por otro mecanismo de auth
- El helper `parseCookies()` en `api/pdp.js`
- El modelo `AccessLog` en `prisma/schema.prisma`
- Las migraciones de Prisma asociadas a la tabla `access_log`
- La dependencia de base de datos (Prisma + Neon)
- El mensaje "login Successfully" y su lógica en `index.html` y `css/index.css`
- Los redirects a `/?success=1` en `server.js` y `api/login.js`

## API Endpoints

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/` | GET | No | Login page |
| `/api/login` | POST | No | Validate password, set JWT cookie |
| `/pdp` | GET | Yes | Protected product page |
| `/api/pdp` | GET | Yes | Protected product page (used by Vercel) |
| `/logout` | GET | No | Clear JWT cookie, redirect to login |

## Auth Flow

```
Browser                  Server
  │                        │
  │  POST /api/login       │
  │  (password) ──────────>│
  │                        │  Validate password
  │                        │  Sign JWT
  │  302 + Set-Cookie: JWT │
  │  <──────────────────── │
  │                        │
  │  GET /pdp               │
  │  (cookie: JWT) ───────>│
  │                        │  Verify JWT
  │  200 (HTML page) <─────│
```

On Vercel, `/pdp` is rewritten to `/api/pdp` via `vercel.json`. Direct access to `pdp-cimsource-cam.html` is rewritten to `/` (login required).
