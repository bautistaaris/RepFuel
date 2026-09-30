// Global seed: only creates GLOBAL exercises (userId=null). Safe to run in production.
// To create the first admin user, run `npm run seed:admin` (see scripts/seed-admin.ts).

import { PrismaClient } from "@prisma/client";

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
  for (const ex of EXERCISES) {
    const existing = await prisma.exercise.findFirst({
      where: { name: ex.name, userId: null },
    });
    if (!existing) {
      await prisma.exercise.create({ data: { ...ex, userId: null, isCustom: false } });
    }
  }
  console.log(`✓ ${EXERCISES.length} global exercises`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());