const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const mysql = require('../lib/mysql');

// ==================== MENU CONFIGURATION ====================
const MENU_CONFIG = {
  admin: [
    {
      id: 'master',
      title: 'Master Data',
      description: 'Manage items, customers, and students',
      modules: [
        { id: 'items', name: 'Items', path: '/items' },
        { id: 'customers', name: 'Customers', path: '/customers' },
        { id: 'students', name: 'Students', path: '/students' }
      ]
    },
    {
      id: 'report',
      title: 'Reports',
      description: 'View and export reports',
      path: '/reports'
    },
    {
      id: 'admin',
      title: 'Admin Panel',
      description: 'User management and system settings',
      path: '/admin'
    },
    {
      id: 'profile',
      title: 'Profile',
      description: 'Manage your account',
      path: '/profile'
    }
  ],
  user: [
    {
      id: 'report',
      title: 'Reports',
      description: 'View reports',
      path: '/reports'
    },
    {
      id: 'profile',
      title: 'Profile',
      description: 'Manage your account',
      path: '/profile'
    }
  ],
  guest: [
    {
      id: 'profile',
      title: 'Profile',
      description: 'View your profile',
      path: '/profile'
    }
  ]
};

// ==================== HELPER FUNCTIONS ====================
function getMenuByRole(role) {
  return MENU_CONFIG[role] || MENU_CONFIG['guest'];
}

function generateMenuHTML(username, role, menuList) {
  const menuItems = menuList.map(menu => {
    const modulesHtml = menu.modules
      ? `<div class="modules">
           ${menu.modules.map(m => 
             `<a href="${m.path}" class="module-link">${m.name}</a>`
           ).join('')}
         </div>`
      : '';
    
    const linkHtml = menu.path 
      ? `<a href="${menu.path}" class="menu-title">${menu.title}</a>`
      : `<span class="menu-title">${menu.title}</span>`;
    
    return `
      <div class="menu-item">
        ${linkHtml}
        ${menu.description ? `<p class="description">${menu.description}</p>` : ''}
        ${modulesHtml}
      </div>
    `;
  }).join('\n');

  return `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Main Menu - PKM Prototype</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 32px;
          text-align: center;
        }
        .header h1 {
          font-size: 32px;
          margin-bottom: 12px;
          font-weight: 700;
        }
        .user-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 16px;
          opacity: 0.95;
        }
        .badge {
          background: rgba(255,255,255,0.25);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .content {
          padding: 32px;
        }
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }
        .menu-item {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 12px;
          padding: 24px;
          transition: all 0.3s ease;
        }
        .menu-item:hover {
          border-color: #667eea;
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2);
        }
        .menu-title {
          font-size: 20px;
          font-weight: 700;
          color: #2d3748;
          text-decoration: none;
          display: block;
          margin-bottom: 8px;
        }
        .menu-title:hover {
          color: #667eea;
        }
        .description {
          color: #718096;
          font-size: 14px;
          margin-bottom: 16px;
          line-height: 1.5;
        }
        .modules {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .module-link {
          background: white;
          border: 1px solid #e2e8f0;
          color: #4a5568;
          padding: 6px 12px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 13px;
          transition: all 0.2s;
        }
        .module-link:hover {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }
        .footer {
          text-align: center;
          padding: 24px;
          border-top: 1px solid #e9ecef;
        }
        .btn-logout {
          background: #ef4444;
          color: white;
          padding: 12px 32px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: all 0.3s;
        }
        .btn-logout:hover {
          background: #dc2626;
          transform: scale(1.05);
        }
        @media (max-width: 640px) {
          .menu-grid {
            grid-template-columns: 1fr;
          }
          .header h1 {
            font-size: 24px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏠 Main Menu</h1>
          <div class="user-info">
            <span>Welcome, <strong>${username}</strong></span>
            <span class="badge">${role}</span>
          </div>
        </div>
        
        <div class="content">
          <div class="menu-grid">
            ${menuItems}
          </div>
        </div>
        
        <div class="footer">
          <a href="/logout" class="btn-logout">Sign Out</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ==================== ROUTE HANDLER ====================
router.get('/menu', requireAuth, async (req, res) => {
  try {
    // Use JWT payload to render menu, avoid DB hit
    const { id, username, role } = req.user;
    const menuList = getMenuByRole(role);

    // Check if client wants HTML or JSON
    const accept = req.headers.accept || '';
    const wantsJson = accept.includes('application/json');
    const wantsHtml = accept.includes('text/html') || accept.includes('*/*');

    // Return JSON for API clients
    if (wantsJson || req.query.format === 'json') {
      return res.json({
        success: true,
        user: {
          id,
          username,
          role
        },
        menu: menuList,
        links: {
          logout: '/logout',
          admin: role === 'admin' ? '/admin' : null
        }
      });
    }

    // Return HTML for browser clients
    if (wantsHtml) {
      return res.type('html').send(generateMenuHTML(username, role, menuList));
    }

    // Default to JSON if neither specified
    return res.json({
      success: true,
      user: { username, role },
      menu: menuList
    });

  } catch (err) {
    console.error('Error loading menu:', err.message);
    
    // Check if headers already sent
    if (res.headersSent) {
      return;
    }

    // Send appropriate error response
    const accept = req.headers.accept || '';
    if (accept.includes('text/html')) {
      return res.status(500).type('html').send(`
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Error - PKM Prototype</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 100px auto;
              padding: 20px;
              text-align: center;
            }
            .error-box {
              background: #fee;
              border: 2px solid #fcc;
              border-radius: 8px;
              padding: 24px;
            }
            h1 { color: #c33; }
            a {
              display: inline-block;
              margin-top: 16px;
              padding: 10px 20px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
            }
          </style>
        </head>
        <body>
          <div class="error-box">
            <h1>⚠️ Error Loading Menu</h1>
            <p>We encountered an error while loading your menu.</p>
            <p><strong>Error:</strong> ${err.message}</p>
            <a href="/">Back to Home</a>
          </div>
        </body>
        </html>
      `);
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to load menu',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;