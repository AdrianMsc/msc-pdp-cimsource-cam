const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const PASSWORD = env.match(/PASSWORD=(.+)/)?.[1]?.trim();
const JWT_SECRET = env.match(/JWT_SECRET=(.+)/)?.[1]?.trim() || 'dev-jwt-secret';

if (!PASSWORD) {
  console.error('ERROR: No se encontró PASSWORD en .env');
  process.exit(1);
}

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(__dirname));

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

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, maxAge: 86400000, sameSite: 'lax' });
    return res.redirect('/product');
  }
  res.redirect('/?error=1');
});

app.get('/api/product', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'pdp-cimsource-cam.html'));
});

app.get('/product', requireAuth, (req, res) => {
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
