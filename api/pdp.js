const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// [LOGIN DETECTOR - A RETIRAR] Helper para parsear cookies manualmente en
// el contexto serverless (no hay cookie-parser como en server.js).
function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach(c => {
    const [name, ...rest] = c.trim().split('=');
    cookies[name] = rest.join('=');
  });
  return cookies;
}

// [LOGIN DETECTOR - A RETIRAR] Idéntica a la versión en server.js: registra
// cada acceso autenticado a /pdp en la tabla AccessLog. Se eliminará junto
// con el resto del feature de logging de accesos.
async function logAccess(req) {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const ua = req.headers['user-agent'] || '';
    const fingerprint = crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex');
    await prisma.accessLog.create({
      data: {
        fingerprint,
        ip,
        userAgent: ua.substring(0, 500),
        referer: (req.headers['referer'] || '').substring(0, 1000),
        language: req.headers['accept-language'] || null,
      },
    });
  } catch (err) {
    console.error('Error logging access:', err.message);
  }
}

module.exports = async (req, res) => {
  // [LOGIN DETECTOR - A RETIRAR] Detección de sesión: parsea cookies y verifica el JWT.
  // Si no hay token o es inválido, redirige al login. La llamada a logAccess() registra
  // la visita. Todo este bloque se eliminará junto con el feature.
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.token;

  if (!token) {
    res.writeHead(302, { Location: '/' });
    return res.end();
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    res.writeHead(302, { Location: '/' });
    return res.end();
  }

  await logAccess(req);

  const html = fs.readFileSync(path.join(process.cwd(), 'pdp-cimsource-cam.html'), 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
};
