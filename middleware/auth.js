const jwt = require('jsonwebtoken');

function getTokenFromRequest(req) {
  // Prefer HttpOnly cookie named 'auth'
  if (req.cookies && req.cookies.auth) return req.cookies.auth;
  // Fallback to Authorization: Bearer <token>
  const h = req.headers && req.headers.authorization;
  if (h && /^Bearer\s+/i.test(h)) return h.replace(/^Bearer\s+/i, '');
  return null;
}

function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) throw new Error('No token');

    const secret = process.env.JWT_SECRET || 'dev-jwt-secret';
    const payload = jwt.verify(token, secret);
    if (!payload || !payload.uid) throw new Error('Invalid token');

    req.user = { id: payload.uid, username: payload.username, role: payload.role };
    return next();
  } catch (err) {
    const accept = (req.headers && req.headers.accept) || '';
    if (accept.includes('text/html')) {
      return res.status(401).type('html').send('<p>Unauthorized. Please login.</p>');
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { requireAuth };
