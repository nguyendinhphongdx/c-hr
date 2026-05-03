#!/usr/bin/env node
/**
 * switch-db.js — change Prisma datasource provider.
 *
 * Usage:
 *   node scripts/switch-db.js postgresql
 *   node scripts/switch-db.js mysql
 *   node scripts/switch-db.js sqlite
 *
 * Or:
 *   pnpm db:switch <provider>
 *
 * After switching:
 *   1. Update DATABASE_URL in .env to match the new provider's format
 *   2. Delete prisma/migrations/ (migrations are provider-specific)
 *   3. Run `pnpm prisma:migrate` to regenerate
 */
const fs = require('fs');
const path = require('path');

const SUPPORTED = ['postgresql', 'mysql', 'sqlite', 'sqlserver', 'mongodb'];
const URL_HINTS = {
  postgresql: 'postgresql://postgres:postgres@localhost:5432/app_db',
  mysql: 'mysql://root:root@localhost:3306/app_db',
  sqlite: 'file:./dev.db',
  sqlserver: 'sqlserver://localhost:1433;database=app_db;user=sa;password=YourStrong!Password;trustServerCertificate=true',
  mongodb: 'mongodb://localhost:27017/app_db',
};

const target = process.argv[2];
if (!target || !SUPPORTED.includes(target)) {
  console.error(`Usage: switch-db.js <${SUPPORTED.join('|')}>`);
  process.exit(1);
}

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

const updated = schema.replace(
  /(datasource\s+\w+\s*\{[^}]*provider\s*=\s*)"[^"]+"/m,
  `$1"${target}"`,
);

if (updated === schema) {
  console.error('✗ Could not find datasource provider line in prisma/schema.prisma');
  process.exit(1);
}

fs.writeFileSync(schemaPath, updated);
console.log(`✔ Set Prisma provider to: ${target}`);
console.log(`  Suggested DATABASE_URL: ${URL_HINTS[target]}`);
console.log(`
Next:
  1. Update DATABASE_URL in .env
  2. rm -rf prisma/migrations/
  3. pnpm prisma:migrate
`);
