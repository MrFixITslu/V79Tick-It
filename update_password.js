import db from './server/db.js';
import bcrypt from 'bcryptjs';

const email = 'john@example.com';
const password = 'password123';
const hashedPassword = await bcrypt.hash(password, 10);

const result = db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").run(hashedPassword, email);
console.log(`Updated ${result.changes} user(s).`);
process.exit(0);
