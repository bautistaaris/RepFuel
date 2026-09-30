/**
 * Seed admin user script.
 * Uso: npm run seed:admin
 * Lee ADMIN_EMAIL y ADMIN_PASSWORD de .env y crea/actualiza el admin.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    console.error("ADMIN_EMAIL y ADMIN_PASSWORD son requeridos");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD debe tener al menos 8 caracteres");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name },
    update: { passwordHash, name },
  });

  await prisma.dailyNutritionTarget.upsert({
    where: { userId: user.id },
    create: { userId: user.id, calories: 2800, protein: 160, carbs: 350, fat: 80 },
    update: {},
  });

  await prisma.appSetting.upsert({
    where: { userId: user.id },
    create: { userId: user.id, units: "metric", theme: "dark", locale: "es", weeklyGoal: 4 },
    update: {},
  });

  console.log(`✓ Admin listo: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });