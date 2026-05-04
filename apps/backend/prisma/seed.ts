import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { DEFAULT_REQUEST_GROUPS } from '../src/apps/requests/groups.config';

// This script doesn't go through NestJS bootstrap, so @nestjs/config
// isn't loading env for us. Mirror the cascade from src/app.module.ts
// (first found wins; loadEnvFile does not overwrite already-set vars).
for (const rel of ['.env.local', '.env', '../../.env']) {
  const abs = resolve(process.cwd(), rel);
  if (existsSync(abs)) process.loadEnvFile(abs);
}

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

const SYSOWNER_EMAIL = process.env.ADMIN_EMAIL || 'sysowner@c-hr.local';
const SYSOWNER_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';

const DEMO_ORG_SLUG = 'acme-demo';
const DEMO_ORG_NAME = 'Acme Demo';
const DEMO_ADMIN_EMAIL = 'founder@acme.test';
const DEMO_ADMIN_NAME = 'Acme Founder';
const DEMO_USER_EMAIL = 'employee@acme.test';
const DEMO_USER_NAME = 'Acme Employee';
const DEMO_USER_PASSWORD = 'Demo@123456';

async function ensureUser(args: {
  email: string;
  password: string;
  name: string;
  role: 'sysowner' | 'admin' | 'user';
  organizationId: string | null;
}) {
  const existing = await prisma.user.findUnique({ where: { email: args.email } });
  if (existing) {
    console.log(`✔ user exists: ${args.email}`);
    return existing;
  }
  const created = await prisma.user.create({
    data: {
      email: args.email,
      password: await bcrypt.hash(args.password, SALT_ROUNDS),
      name: args.name,
      role: args.role,
      organizationId: args.organizationId,
    },
  });
  console.log(`✚ user created: ${args.email} (${args.role})`);
  return created;
}

async function ensureOrganization() {
  const existing = await prisma.organization.findUnique({
    where: { slug: DEMO_ORG_SLUG },
  });
  if (existing) {
    console.log(`✔ organization exists: ${DEMO_ORG_SLUG}`);
    return existing;
  }
  const created = await prisma.organization.create({
    data: { slug: DEMO_ORG_SLUG, name: DEMO_ORG_NAME },
  });
  console.log(`✚ organization created: ${DEMO_ORG_SLUG}`);
  return created;
}

async function main() {
  // 1. SaaS sysowner — no Org. Credentials from env (.env ADMIN_EMAIL/PASSWORD).
  await ensureUser({
    email: SYSOWNER_EMAIL,
    password: SYSOWNER_PASSWORD,
    name: 'Sys Owner',
    role: 'sysowner',
    organizationId: null,
  });

  // 2. Demo Org + founder admin + one regular user, for local dev.
  const org = await ensureOrganization();
  await ensureUser({
    email: DEMO_ADMIN_EMAIL,
    password: DEMO_USER_PASSWORD,
    name: DEMO_ADMIN_NAME,
    role: 'admin',
    organizationId: org.id,
  });
  await ensureUser({
    email: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
    name: DEMO_USER_NAME,
    role: 'user',
    organizationId: org.id,
  });

  // 3. Default RequestGroups (system-wide). Idempotent upsert by code.
  for (const g of DEFAULT_REQUEST_GROUPS) {
    await prisma.requestGroup.upsert({
      where: { code: g.code },
      create: {
        code: g.code,
        name: g.name,
        description: g.description,
        // Prisma JSON column accepts unknown — we trust groups.config.ts.
        fieldsSchema: g.fieldsSchema as unknown as object,
        isActive: true,
      },
      update: {
        name: g.name,
        description: g.description,
        fieldsSchema: g.fieldsSchema as unknown as object,
      },
    });
    console.log(`✚ request_group seeded: ${g.code}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
