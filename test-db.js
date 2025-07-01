const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres').default;
const { note } = require('./lib/db/schema.js');

async function testConnection() {
  const client = postgres(process.env.POSTGRES_URL);
  const db = drizzle(client);

  try {
    const notes = await db.select().from(note).limit(1);
    console.log('Database connection successful');
    console.log('Notes table exists, found', notes.length, 'notes');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Database connection failed:', error);
    await client.end();
    process.exit(1);
  }
}

testConnection();
