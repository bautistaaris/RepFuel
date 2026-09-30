import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EXERCISES: Array<{
  name: string;
  muscleGroup: string;
  secondaryMuscles?: string;
  equipment?: string;
}> = [
  { name: "Press Banca Plano", muscleGroup: "Pecho", secondaryMuscles: "Tríceps, Hombro anterior", equipment: "Barra Olímpica" },
  { name: "Press Banca Inclinado", muscleGroup: "Pecho", secondaryMuscles: "Hombro anterior", equipment: "Barra Olímpica" },
  { name: "Press Banca Declinado", muscleGroup: "Pecho", equipment: "Barra Olímpica" },
  { name: "Aperturas con Mancuernas", muscleGroup: "Pecho", equipment: "Mancuernas" },
  { name: "Fondos en Paralelas", muscleGroup: "Pecho", secondaryMuscles: "Tríceps", equipment: "Peso corporal" },
  { name: "Cruce en Poleas", muscleGroup: "Pecho", equipment: "Polea" },
  { name: "Press Militar Sentado", muscleGroup: "Hombro", secondaryMuscles: "Tríceps", equipment: "Mancuernas" },
  { name: "Press Militar de Pie", muscleGroup: "Hombro", secondaryMuscles: "Tríceps", equipment: "Barra Olímpica" },
  { name: "Elevaciones Laterales", muscleGroup: "Hombro", equipment: "Mancuernas" },
  { name: "Elevaciones Frontales", muscleGroup: "Hombro", equipment: "Mancuernas" },
  { name: "Remo al Mentón", muscleGroup: "Hombro", secondaryMuscles: "Trapecio", equipment: "Barra" },
  { name: "Pájaros (Posterior)", muscleGroup: "Hombro", equipment: "Mancuernas" },
  { name: "Dominadas", muscleGroup: "Espalda", secondaryMuscles: "Bíceps", equipment: "Barra fija" },
  { name: "Remo con Barra", muscleGroup: "Espalda", secondaryMuscles: "Bíceps", equipment: "Barra Olímpica" },
  { name: "Remo con Mancuerna", muscleGroup: "Espalda", equipment: "Mancuerna" },
  { name: "Remo en Polea Baja", muscleGroup: "Espalda", equipment: "Polea" },
  { name: "Pull-over con Mancuerna", muscleGroup: "Espalda", secondaryMuscles: "Pecho", equipment: "Mancuerna" },
  { name: "Encogimientos", muscleGroup: "Espalda", secondaryMuscles: "Trapecio", equipment: "Mancuernas" },
  { name: "Sentadilla", muscleGroup: "Pierna", secondaryMuscles: "Glúteo, Core", equipment: "Barra Olímpica" },
  { name: "Prensa", muscleGroup: "Pierna", secondaryMuscles: "Glúteo", equipment: "Máquina" },
  { name: "Extensión de Cuádriceps", muscleGroup: "Pierna", equipment: "Máquina" },
  { name: "Curl de Femoral", muscleGroup: "Pierna", equipment: "Máquina" },
  { name: "Peso Muerto Rumano", muscleGroup: "Pierna", secondaryMuscles: "Glúteo, Espalda baja", equipment: "Barra Olímpica" },
  { name: "Hip Thrust", muscleGroup: "Pierna", secondaryMuscles: "Glúteo", equipment: "Barra Olímpica" },
  { name: "Zancadas", muscleGroup: "Pierna", equipment: "Mancuernas" },
  { name: "Elevación de Gemelos", muscleGroup: "Pierna", equipment: "Máquina" },
  { name: "Curl de Bíceps con Barra", muscleGroup: "Brazo", equipment: "Barra" },
  { name: "Curl de Bíceps con Mancuernas", muscleGroup: "Brazo", equipment: "Mancuernas" },
  { name: "Curl Martillo", muscleGroup: "Brazo", secondaryMuscles: "Antebrazo", equipment: "Mancuernas" },
  { name: "Extensión de Tríceps en Polea", muscleGroup: "Brazo", equipment: "Polea" },
  { name: "Press Francés", muscleGroup: "Brazo", equipment: "Barra" },
  { name: "Patada de Tríceps", muscleGroup: "Brazo", equipment: "Mancuerna" },
  { name: "Crunch", muscleGroup: "Core", equipment: "Peso corporal" },
  { name: "Plancha", muscleGroup: "Core", equipment: "Peso corporal" },
  { name: "Elevación de Piernas Colgado", muscleGroup: "Core", equipment: "Barra fija" },
  { name: "Russian Twist", muscleGroup: "Core", equipment: "Peso ruso" },
];

async function main() {
  console.log("Iniciando seed...");

  for (const ex of EXERCISES) {
    const existing = await prisma.exercise.findFirst({
      where: { name: ex.name, isCustom: false },
    });
    if (!existing) {
      await prisma.exercise.create({
        data: { ...ex, isCustom: false },
      });
    }
  }
  console.log(`✓ ${EXERCISES.length} ejercicios seeded`);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existingUser) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: "Admin",
        },
      });
      console.log(`✓ Admin user creado: ${adminEmail}`);
    } else {
      console.log(`✓ Admin user ya existe: ${adminEmail}`);
    }
  } else {
    console.log("⚠ ADMIN_EMAIL / ADMIN_PASSWORD no seteados — no se crea admin");
  }

  const users = await prisma.user.findMany();
  for (const user of users) {
    const hasTarget = await prisma.dailyNutritionTarget.findUnique({ where: { userId: user.id } });
    if (!hasTarget) {
      await prisma.dailyNutritionTarget.create({
        data: {
          userId: user.id,
          calories: 2800,
          protein: 160,
          carbs: 350,
          fat: 80,
        },
      });
    }
    const hasSettings = await prisma.appSetting.findUnique({ where: { userId: user.id } });
    if (!hasSettings) {
      await prisma.appSetting.create({
        data: {
          userId: user.id,
          units: "metric",
          theme: "dark",
          locale: "es",
          weeklyGoal: 4,
        },
      });
    }
  }

  console.log("✓ Targets y settings inicializados");
  console.log("Seed completo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });