const { db } = require('./server/db-drizzle');
const schema = require('./shared/drizzle-schema');

async function checkUsers() {
  try {
    const users = await db.select().from(schema.users);
    console.log('👥 Usuários cadastrados:');
    users.forEach(u => {
      console.log(`- ${u.username} (${u.fullName}) - ${u.role}`);
    });
    console.log(`\nTotal: ${users.length} usuários`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao consultar usuários:', error);
    process.exit(1);
  }
}

checkUsers();
