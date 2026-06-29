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

  const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '24h' });

  res.writeHead(302, {
    Location: '/pdp',
    'Set-Cookie': `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`,
  });
  res.end();
};
