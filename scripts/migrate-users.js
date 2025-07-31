// scripts/migrate-users.js

import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  // 1) Connect to MySQL using your authsvc credentials
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'authsvc',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'auth',
  });

  // 2) Load users.json
  const usersPath = path.resolve(process.cwd(), 'data', 'users.json');
  const raw       = await fs.readFile(usersPath, 'utf8');
  const users     = JSON.parse(raw);

  console.log(`Found ${users.length} users in JSON.`);

  // 3) Upsert each user into auth_user
  for (const u of users) {
    const username      = u.username.toLowerCase();
    const password_hash = u.password;    // your JSON stores bcrypt hashes here
    const email         = u.email       || null;
    const full_name     = u.full_name   || null;
    const is_public     = u.isPublic ? 1 : 0;

    try {
      await connection.execute(
        `INSERT INTO auth_user
           (username, password_hash, email, full_name, is_public)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           password_hash = VALUES(password_hash),
           email         = VALUES(email),
           full_name     = VALUES(full_name),
           is_public     = VALUES(is_public)`,
        [username, password_hash, email, full_name, is_public]
      );
      console.log(`Upserted user: ${username}`);
    } catch (e) {
      console.error(`Failed to upsert ${username}:`, e.message);
    }
  }

  await connection.end();
  console.log('Migration complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
