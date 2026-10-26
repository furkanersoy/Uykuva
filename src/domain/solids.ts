import { CareEvent } from "./types";

export type FoodHistoryItem = {
  name: string;
  firstRecordedAt: string;
  mealCount: number;
};

export type AllergenTagHistoryItem = {
  name: string;
  firstTaggedAt: string;
  taggedMealCount: number;
};

export type SolidMealObservation = {
  startedAt: string;
  foods: string[];
  allergens: string[];
  note: string;
};

export function summarizeSolidFoodHistory(events: CareEvent[]) {
  const meals = events
    .filter((event) => event.kind === "feed" && event.feedType === "solid" && Number.isFinite(new Date(event.startedAt).getTime()))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const foods = new Map<string, FoodHistoryItem>();
  const allergens = new Map<string, AllergenTagHistoryItem>();

  for (const meal of meals) {
    const seenFoods = new Set<string>();
    for (const rawName of meal.foods ?? []) {
      const name = rawName.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase("tr-TR");
      if (seenFoods.has(key)) continue;
      seenFoods.add(key);
      const existing = foods.get(key);
      if (existing) {
        existing.mealCount += 1;
        if (meal.startedAt < existing.firstRecordedAt) existing.firstRecordedAt = meal.startedAt;
      }
      else foods.set(key, { name, firstRecordedAt: meal.startedAt, mealCount: 1 });
    }
    for (const rawName of meal.allergens ?? []) {
      const name = rawName.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase("tr-TR");
      const existing = allergens.get(key);
      if (existing) {
        existing.taggedMealCount += 1;
        if (meal.startedAt < existing.firstTaggedAt) existing.firstTaggedAt = meal.startedAt;
      }
      else allergens.set(key, { name, firstTaggedAt: meal.startedAt, taggedMealCount: 1 });
    }
  }

  return {
    mealCount: meals.length,
    foods: [...foods.values()].sort((a, b) => b.firstRecordedAt.localeCompare(a.firstRecordedAt)),
    allergens: [...allergens.values()].sort((a, b) => b.firstTaggedAt.localeCompare(a.firstTaggedAt)),
    observations: meals
      .filter((meal) => Boolean(meal.reactionNote?.trim()))
      .slice(0, 5)
      .map((meal): SolidMealObservation => ({
        startedAt: meal.startedAt,
        foods: meal.foods ?? [],
        allergens: meal.allergens ?? [],
        note: meal.reactionNote!.trim()
      }))
  };
}
