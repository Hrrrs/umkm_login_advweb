function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  // If browser expects HTML redirect to login page (not implemented), return JSON for API
  const accept = (req.headers && req.headers.accept) || '';
  if (accept.includes('text/html')) {
    return res.status(401).type('html').send('<p>Unauthorized. Please login.</p>');
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { requireAuth };
