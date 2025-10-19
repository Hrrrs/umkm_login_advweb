const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function debugLogin() {
  console.log('🔍 Starting login diagnostic...\n');

  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'pkm_demo',
  };

  console.log('📋 Database Config:');
  console.log('   Host:', config.host);
  console.log('   Port:', config.port);
  console.log('   User:', config.user);
  console.log('   Database:', config.database);
  console.log('');

  let conn;
  try {
    // Step 1: Connect
    console.log('1️⃣  Connecting to MySQL...');
    conn = await mysql.createConnection(config);
    console.log('   ✅ Connected\n');

    // Step 2: Check if users table exists
    console.log('2️⃣  Checking users table...');
    const [tables] = await conn.query("SHOW TABLES LIKE 'users'");
    if (tables.length === 0) {
      console.log('   ❌ Users table does NOT exist!');
      console.log('   💡 Run: node index.js to initialize schema\n');
      process.exit(1);
    }
    console.log('   ✅ Users table exists\n');

    // Step 3: Check admin user
    console.log('3️⃣  Checking admin user...');
    const [users] = await conn.query('SELECT * FROM users WHERE username = ?', ['admin']);
    
    if (users.length === 0) {
      console.log('   ❌ Admin user does NOT exist!');
      console.log('   💡 Run: node reset_admin.js\n');
      process.exit(1);
    }
    
    const admin = users[0];
    console.log('   ✅ Admin user found');
    console.log('   ID:', admin.id);
    console.log('   Username:', admin.username);
    console.log('   Role:', admin.role);
    console.log('   Password hash:', admin.password.substring(0, 20) + '...');
    console.log('   Created:', admin.createdAt);
    console.log('');

    // Step 4: Test password hashing
    console.log('4️⃣  Testing password verification...');
    const testPassword = 'admin';
    console.log('   Testing password:', testPassword);
    
    try {
      const match = await bcrypt.compare(testPassword, admin.password);
      if (match) {
        console.log('   ✅ Password matches!\n');
      } else {
        console.log('   ❌ Password does NOT match!');
        console.log('   💡 The stored hash doesn\'t match "admin"');
        console.log('   💡 Run: node reset_admin.js again\n');
        process.exit(1);
      }
    } catch (err) {
      console.log('   ❌ Error comparing password:', err.message);
      console.log('   💡 Password hash might be corrupted\n');
      process.exit(1);
    }

    // Step 5: Test creating a new hash
    console.log('5️⃣  Testing bcrypt functionality...');
    const newHash = await bcrypt.hash('admin', 10);
    console.log('   ✅ bcrypt working');
    console.log('   New hash sample:', newHash.substring(0, 20) + '...');
    console.log('');

    // Step 6: List all users
    console.log('6️⃣  Listing all users:');
    const [allUsers] = await conn.query('SELECT id, username, role, createdAt FROM users');
    console.log('   Total users:', allUsers.length);
    allUsers.forEach(u => {
      console.log(`   - [${u.id}] ${u.username} (${u.role})`);
    });
    console.log('');

    // Step 7: Test session
    console.log('7️⃣  Checking session configuration...');
    if (process.env.SESSION_SECRET) {
      console.log('   ✅ SESSION_SECRET is set');
    } else {
      console.log('   ⚠️  SESSION_SECRET not set (using default)');
    }
    console.log('');

    // Final summary
    console.log('═══════════════════════════════════════');
    console.log('✅ DIAGNOSTIC COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('🎯 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin');
    console.log('');
    console.log('🌐 Try logging in at:');
    console.log('   http://localhost:3000');
    console.log('');
    console.log('If login still fails, check:');
    console.log('   1. Server logs when you try to login');
    console.log('   2. Browser console for errors');
    console.log('   3. Network tab to see the request');
    console.log('');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Is MySQL running?');
    console.error('   2. Are credentials correct?');
    console.error('   3. Does database exist?');
    console.error('   4. Check .env file if you\'re using one');
    console.error('');
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

debugLogin();