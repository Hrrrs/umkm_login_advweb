const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
  console.log('🔧 Resetting admin user...\n');

  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'pkm_demo',
  };

  let conn;
  try {
    // Connect to MySQL
    conn = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL');

    // Hash the password 'admin'
    const hashedPassword = await bcrypt.hash('admin', 10);
    console.log('✅ Password hashed');

    // Check if admin exists
    const [rows] = await conn.query('SELECT id FROM users WHERE username = ?', ['admin']);

    if (rows.length > 0) {
      // Update existing admin
      await conn.query(
        'UPDATE users SET password = ?, role = ? WHERE username = ?',
        [hashedPassword, 'admin', 'admin']
      );
      console.log('✅ Admin user updated');
      console.log('\n📝 You can now login with:');
      console.log('   Username: admin');
      console.log('   Password: admin\n');
    } else {
      // Create new admin
      await conn.query(
        'INSERT INTO users (username, password, role, createdAt) VALUES (?, ?, ?, NOW())',
        ['admin', hashedPassword, 'admin']
      );
      console.log('✅ Admin user created');
      console.log('\n📝 You can now login with:');
      console.log('   Username: admin');
      console.log('   Password: admin\n');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('\n💡 Make sure:');
    console.error('   1. MySQL is running');
    console.error('   2. Database exists');
    console.error('   3. Environment variables are set correctly\n');
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

resetAdmin();