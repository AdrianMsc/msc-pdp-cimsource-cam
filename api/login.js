const jwt = require('jsonwebtoken');

const PASSWORD = process.env.PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const password = req.body?.password;

  if (!password || password !== PASSWORD) {
    res.writeHead(302, { Location: '/?error=1' });
    return res.end();
  }

  // [LOGIN DETECTOR - A RETIRAR] Firma el JWT que luego se verifica en
  // requireAuth (server.js) o en api/pdp.js para detectar la sesión activa.
  const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '24h' });

  res.writeHead(302, {
    Location: '/?success=1',
    'Set-Cookie': `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`,
  });
  res.end();
};
