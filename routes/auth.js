const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const mysql = require('../lib/mysql');
const {
  validateUsername,
  validatePassword,
  validateRole,
  validateId,
  sanitizeUser,
  successResponse,
  errorResponse,
  validationErrorResponse
} = require('../lib/validation');

// ==================== LOGIN ====================
// Route-scoped body parser (urlencoded only) to avoid Content-Length mismatch issues
router.post(
  '/login',
  express.urlencoded({ extended: true, limit: '10kb', type: () => true }),
  async (req, res) => {
  try {
    const { username, password } = req.body || {};
    console.log('🔐 Login attempt:', { username, passwordLength: password?.length });

    // Determine if this is an HTML form submission
    const accept0 = req.headers.accept || '';
    const contentType0 = req.headers['content-type'] || '';
    const wantsHtml0 =
      accept0.includes('text/html') ||
      contentType0.includes('application/x-www-form-urlencoded') ||
      contentType0.includes('multipart/form-data');

    // Validate username
    const usernameCheck = validateUsername(username);
    console.log('   Username validation:', usernameCheck);
    if (!usernameCheck.valid) {
      if (wantsHtml0) return res.redirect('/?error=' + encodeURIComponent(usernameCheck.error));
      return res.status(400).json(validationErrorResponse(usernameCheck.error));
    }

    // Validate password
    const passwordCheck = validatePassword(password, { minLength: 1 });
    console.log('   Password validation:', passwordCheck);
    if (!passwordCheck.valid) {
      if (wantsHtml0) return res.redirect('/?error=' + encodeURIComponent(passwordCheck.error));
      return res.status(400).json(validationErrorResponse(passwordCheck.error));
    }

    // Check MySQL availability
    if (!mysql.mysqlEnabled()) {
      if (wantsHtml0) return res.redirect('/?error=' + encodeURIComponent('Database is not configured'));
      return res.status(503).json(
        errorResponse('Service unavailable', 'Database is not configured')
      );
    }

    // Find user
    const user = await mysql.findUserByUsername(usernameCheck.value || username);
    console.log('   User found:', user ? 'YES' : 'NO');
    if (!user) {
      if (wantsHtml0) return res.redirect('/?error=' + encodeURIComponent('Invalid username or password'));
      return res.status(401).json(
        errorResponse('Authentication failed', 'Invalid username or password')
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(String(password), String(user.password));
    console.log('   Password match:', passwordMatch);
    if (!passwordMatch) {
      if (wantsHtml0) return res.redirect('/?error=' + encodeURIComponent('Invalid username or password'));
      return res.status(401).json(
        errorResponse('Authentication failed', 'Invalid username or password')
      );
    }

    // Determine response format
    const accept = req.headers.accept || '';
    const contentType = req.headers['content-type'] || '';
    const wantsHtml = 
      accept.includes('text/html') || 
      contentType.includes('application/x-www-form-urlencoded') || 
      contentType.includes('multipart/form-data');

    // Create JWT and set cookie
    const payload = { uid: user.id, username: user.username, role: user.role };
    const secret = process.env.JWT_SECRET || 'dev-jwt-secret';
    const token = jwt.sign(payload, secret, { expiresIn: '30m' });
    res.cookie('auth', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 30
    });

    // HTML form submission - redirect
    if (wantsHtml) {
      return res.redirect('/menu');
    }

    // JSON API response
    return res.json(
      successResponse(
        { user: sanitizeUser(user), token, redirect: '/menu' },
        'Login successful'
      )
    );

  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json(
      errorResponse(
        'Internal server error',
        'An error occurred during login',
        { details: process.env.NODE_ENV === 'development' ? err.message : undefined }
      )
    );
  }
});

// ==================== LOGOUT ====================
router.get('/logout', (req, res) => {
  // Clear JWT cookie
  res.clearCookie('auth');
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) {
    return res.redirect('/');
  }
  return res.json(
    successResponse({ redirect: '/' }, 'Logged out successfully')
  );
});

// ==================== REGISTER (Admin only) ====================
router.post('/register', requireAuth, async (req, res) => {
  try {
    // Check MySQL availability
    if (!mysql.mysqlEnabled()) {
      return res.status(503).json(
        errorResponse('Service unavailable', 'Database is not configured')
      );
    }

    // Check if requester is admin
    const currentUser = await mysql.getUserById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json(
        errorResponse('Forbidden', 'Only administrators can create users')
      );
    }

    const { username, password, role } = req.body || {};

    // Validate username
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      return res.status(400).json(validationErrorResponse(usernameCheck.error));
    }

    // Validate password
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json(validationErrorResponse(passwordCheck.error));
    }

    // Validate role
    const roleCheck = validateRole(role);
    if (!roleCheck.valid) {
      return res.status(400).json(validationErrorResponse(roleCheck.error));
    }

    // Check if username already exists
    const existing = await mysql.findUserByUsername(usernameCheck.value || username);
    if (existing) {
      return res.status(409).json(
        errorResponse('Conflict', 'Username already exists')
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await mysql.createUser({
      username: usernameCheck.value || username,
      password: hashedPassword,
      role: roleCheck.role
    });

    return res.status(201).json(
      successResponse(
        { user: sanitizeUser(newUser) },
        'User created successfully'
      )
    );

  } catch (err) {
    console.error('Register error:', err.message);
    
    if (err.message && err.message.includes('already exists')) {
      return res.status(409).json(
        errorResponse('Conflict', 'Username already exists')
      );
    }

    return res.status(500).json(
      errorResponse(
        'Internal server error',
        'Failed to create user',
        { details: process.env.NODE_ENV === 'development' ? err.message : undefined }
      )
    );
  }
});

// ==================== LIST USERS (Admin only) ====================
router.get('/api/users', requireAuth, async (req, res) => {
  try {
    if (!mysql.mysqlEnabled()) {
      return res.status(503).json(
        errorResponse('Service unavailable', 'Database is not configured')
      );
    }

    const currentUser = await mysql.getUserById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json(
        errorResponse('Forbidden', 'Only administrators can list users')
      );
    }

    const users = await mysql.listUsers();
    
    return res.json(
      successResponse(
        { 
          count: users.length,
          users: users.map(sanitizeUser) 
        },
        'Users retrieved successfully'
      )
    );

  } catch (err) {
    console.error('List users error:', err.message);
    return res.status(500).json(
      errorResponse(
        'Internal server error',
        'Failed to retrieve users',
        { details: process.env.NODE_ENV === 'development' ? err.message : undefined }
      )
    );
  }
});

// ==================== UPDATE USER (Admin only) ====================
router.put('/api/users/:id', requireAuth, async (req, res) => {
  try {
    if (!mysql.mysqlEnabled()) {
      return res.status(503).json(
        errorResponse('Service unavailable', 'Database is not configured')
      );
    }

    const currentUser = await mysql.getUserById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json(
        errorResponse('Forbidden', 'Only administrators can update users')
      );
    }

    // Validate ID
    const idCheck = validateId(req.params.id);
    if (!idCheck.valid) {
      return res.status(400).json(validationErrorResponse(idCheck.error));
    }

    const { password, role } = req.body || {};
    const changes = {};

    // Validate and hash new password if provided
    if (password) {
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        return res.status(400).json(validationErrorResponse(passwordCheck.error));
      }
      changes.password = await bcrypt.hash(password, 10);
    }

    // Validate role if provided
    if (role) {
      const roleCheck = validateRole(role);
      if (!roleCheck.valid) {
        return res.status(400).json(validationErrorResponse(roleCheck.error));
      }
      changes.role = roleCheck.role;
    }

    // Check if there are any changes
    if (Object.keys(changes).length === 0) {
      return res.status(400).json(
        validationErrorResponse('No valid fields to update')
      );
    }

    // Update user
    const updatedUser = await mysql.updateUser(idCheck.value, changes);
    
    if (!updatedUser) {
      return res.status(404).json(
        errorResponse('Not found', 'User not found')
      );
    }

    return res.json(
      successResponse(
        { user: sanitizeUser (updatedUser) },
        'User updated successfully'
      )
    );
  } catch (err) {
    console.error('Update user error:', err.message);
    return res.status(500).json(
      errorResponse(
        'Internal server error',
        'Failed to update user',
        { details: process.env.NODE_ENV === 'development' ? err.message : undefined }
      )
    );
  }
});

// ==================== DELETE USER (Admin only) ====================
router.delete('/api/users/:id', requireAuth, async (req, res) => {
  try {
    if (!mysql.mysqlEnabled()) {
      return res.status(503).json(
        errorResponse('Service unavailable', 'Database is not configured')
      );
    }

    const currentUser = await mysql.getUserById(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json(
        errorResponse('Forbidden', 'Only administrators can delete users')
      );
    }

    // Validate ID
    const idCheck = validateId(req.params.id);
    if (!idCheck.valid) {
      return res.status(400).json(validationErrorResponse(idCheck.error));
    }

    // Delete user
    const deletedUser = await mysql.deleteUser(idCheck.value);
    
    if (!deletedUser) {
      return res.status(404).json(
        errorResponse('Not found', 'User not found')
      );
    }

    return res.json(
      successResponse(
        {},
        'User deleted successfully'
      )
    );
  } catch (err) {
    console.error('Delete user error:', err.message);
    return res.status(500).json(
      errorResponse(
        'Internal server error',
        'Failed to delete user',
        { details: process.env.NODE_ENV === 'development' ? err.message : undefined }
      )
    );
  }
});

module.exports = router;