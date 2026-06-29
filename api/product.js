const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach(c => {
    const [name, ...rest] = c.trim().split('=');
    cookies[name] = rest.join('=');
  });
  return cookies;
}

module.exports = async (req, res) => {
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

  const html = fs.readFileSync(path.join(process.cwd(), 'pdp-cimsource-cam.html'), 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
};
