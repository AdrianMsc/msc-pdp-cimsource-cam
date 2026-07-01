const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');

const env = fs.readFileSync('.env', 'utf8');
const PASSWORD = env.match(/^PASSWORD=(.+)$/m)?.[1]?.trim();
const JWT_SECRET = env.match(/^JWT_SECRET=(.+)$/m)?.[1]?.trim() || 'dev-jwt-secret';

if (!PASSWORD) {
  console.error('ERROR: No se encontró PASSWORD en .env');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(__dirname));

// [LOGIN DETECTOR - A RETIRAR] Middleware que verifica la existencia y validez
// del token JWT en la cookie. Si no hay token o es inválido, redirige al login.
// Este es el núcleo del "detector de inicio de sesión".
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect('/');
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('token');
    res.redirect('/');
  }
}

// [LOGIN DETECTOR - A RETIRAR] Función que registra cada acceso a la página
// protegida en la base de datos. Genera un fingerprint con IP + User-Agent
// y persiste datos como IP, userAgent, referer, language y fingerprint.
// Este logging se eliminará junto con el modelo AccessLog de Prisma.
async function logAccess(req) {
  try {
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    const ua = req.headers['user-agent'];
    const fingerprint = crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex');
    await prisma.accessLog.create({
      data: {
        ip,
        userAgent: ua?.substring(0, 500),
        referer: req.headers['referer']?.substring(0, 1000),
        language: req.headers['accept-language'],
        fingerprint,
      },
    });
  } catch (err) {
    console.error('Error logging access:', err.message);
  }
}

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    // [LOGIN DETECTOR - A RETIRAR] Firma el JWT que luego requireAuth detecta
    const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, maxAge: 86400000, sameSite: 'lax' });
    return res.redirect('/?success=1');
  }
  res.redirect('/?error=1');
});

// [LOGIN DETECTOR - A RETIRAR] Rutas protegidas: requireAuth detecta la sesión
// y logAccess registra la visita. Ambas se eliminarán junto con el feature.
app.get('/api/pdp', requireAuth, async (req, res) => {
  await logAccess(req);
  res.sendFile(path.join(__dirname, 'pdp-cimsource-cam.html'));
});

app.get('/pdp', requireAuth, async (req, res) => {
  await logAccess(req);
  res.sendFile(path.join(__dirname, 'pdp-cimsource-cam.html'));
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
