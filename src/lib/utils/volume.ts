export function setVolume(weight: number | null | undefined, reps: number | null | undefined): number {
  if (weight === null || weight === undefined || reps === null || reps === undefined) return 0;
  if (weight <= 0 || reps <= 0) return 0;
  return weight * reps;
}

export type SetLike = {
  weight: number | null;
  reps: number | null;
  completed: boolean;
};

export type ExerciseLike = {
  sets: SetLike[];
};

export type WorkoutLike = {
  exercises: ExerciseLike[];
};

export function exerciseVolume(sets: SetLike[]): number {
  return sets.reduce((acc, s) => acc + (s.completed ? setVolume(s.weight, s.reps) : 0), 0);
}

export function workoutVolume(workout: WorkoutLike): number {
  return workout.exercises.reduce((acc, e) => acc + exerciseVolume(e.sets), 0);
}

export function workoutCompletedSets(workout: WorkoutLike): number {
  return workout.exercises.reduce((acc, e) => acc + e.sets.filter((s) => s.completed).length, 0);
}

export function workoutTotalSets(workout: WorkoutLike): number {
  return workout.exercises.reduce((acc, e) => acc + e.sets.length, 0);
}

export function workoutTotalReps(workout: WorkoutLike): number {
  return workout.exercises.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.completed).reduce((r, s) => r + (s.reps ?? 0), 0),
    0,
  );
}

export function workoutDurationSeconds(
  workout: { startedAt: Date; endedAt: Date | null },
  now: Date = new Date(),
): number {
  const end = workout.endedAt ?? now;
  return Math.max(0, Math.floor((end.getTime() - workout.startedAt.getTime()) / 1000));
}