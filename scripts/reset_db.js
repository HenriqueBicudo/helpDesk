const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set. Export DATABASE_URL and try again.');
    process.exit(1);
  }

  const sqlFile = path.join(__dirname, 'reset_db.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('SQL file not found:', sqlFile);
    process.exit(1);
  }

  const sqlText = fs.readFileSync(sqlFile, 'utf8');

  const sql = postgres(databaseUrl, { /* use defaults */ });

  try {
    console.log('Applying reset SQL (this will DELETE data)...');
    // Use a single transaction and run the file as unsafe (raw SQL). The SQL file contains multiple statements.
    await sql.begin(async (tx) => {
      await tx.unsafe(sqlText);
    });

    console.log('Reset SQL applied successfully.');

    // If ADMIN_PASSWORD provided, hash it and update admin user(s)
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword) {
      console.log('Hashing and updating admin password...');
      const { scryptSync, randomBytes } = require('crypto');
      const salt = randomBytes(16).toString('hex');
      const key = scryptSync(adminPassword, salt, 64);
      const hashed = `${key.toString('hex')}.${salt}`;

      const result = await sql`UPDATE users SET password=${hashed} WHERE role='admin' RETURNING id, username`;
      console.log('Updated admin users:', result.map(r => r.username).join(', ') || '(none)');
    } else {
      console.log('No ADMIN_PASSWORD provided — admin users keep their current password (or default created by SQL).');
    }

    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error('Error executing reset:', err);
    try { await sql.end(); } catch(e){}
    process.exit(1);
  }
}

main();
