import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`✔ Admin already exists: ${adminEmail}`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: {
      email: adminEmail,
      password: passwordHash,
      name: 'Administrator',
      role: 'ADMIN',
    },
  });
  console.log(`✔ Created admin user: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
