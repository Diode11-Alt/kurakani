const postgres = require('postgres');

async function main() {
  try {
    const sql = postgres({
      host: 'db.qvwpfqskwtbkkphuwsbx.supabase.co',
      port: 5432,
      database: 'postgres',
      username: 'postgres',
      password: 'X/UNKc3J!JsNh3w',
      ssl: 'require'
    });
    
    const result = await sql`SELECT 1 as test`;
    console.log('Success:', result);
    process.exit(0);
  } catch (err) {
    console.error('Error connecting:', err.message);
    process.exit(1);
  }
}

main();
