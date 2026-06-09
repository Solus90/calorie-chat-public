import { tool } from "ai";
import { z } from "zod";
import {
  deleteFoodEntry,
  editFoodEntry,
  findFoodEntry,
  getDailySummary,
  getSettings,
  getWeightSeries,
  getCalorieSeries,
  logFood,
  logWeight,
  updateSettings,
} from "./queries";
import { forecastGoal } from "./forecast";
import {
  displayToKg,
  kgToDisplay,
  roundWeight,
  weightUnitLabel,
  todayLocal,
  type UnitSystem,
} from "./units";
import { isValidDateStr, isWithinLastDays, todayInAppTz } from "./timezone";
import { lookupNutrition } from "./nutrition/lookup";

/** Sanitize a model-supplied date: must be valid and within the last 7 days. Falls back to today. */
function safeDate(dateStr: string | undefined): string {
  const today = todayInAppTz();
  if (!dateStr) return today;
  if (isValidDateStr(dateStr) && isWithinLastDays(dateStr, 7, today)) return dateStr;
  return today;
}

const mealEnum = z.enum(["breakfast", "lunch", "dinner", "snack"]);

function unitFromArg(
  unit: "lb" | "kg" | undefined,
  system: UnitSystem,
): UnitSystem {
  if (unit === "lb") return "imperial";
  if (unit === "kg") return "metric";
  return system;
}

/**
 * The toolset given to Claude. Every tool is scoped to the active profile so
 * each person's data stays separate.
 */
export function buildTools(system: UnitSystem, profileId: string) {
  const unitLabel = weightUnitLabel(system);

  return {
    lookup_food: tool({
      description:
        "Search USDA FoodData Central and Open Food Facts for nutrition data on a food " +
        "or drink. Call this BEFORE log_food when logging something that might exist in a " +
        "database (generic foods, groceries, branded products). Use the returned calories " +
        "per 100g or per serving and scale to the user's stated portion. If no good match, " +
        "estimate from your own knowledge and log anyway.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "Food search terms, e.g. 'scrambled eggs', 'banana', 'Chobani vanilla yogurt'",
          ),
      }),
      execute: async ({ query }) => {
        const result = await lookupNutrition(query);
        return {
          query: result.query,
          candidates: result.candidates.map((c) => ({
            source: c.source,
            name: c.name,
            brand: c.brand ?? null,
            data_type: c.dataType ?? null,
            calories_per_100g: c.caloriesPer100g ?? null,
            calories_per_serving: c.caloriesPerServing ?? null,
            serving: c.servingDescription ?? null,
            serving_grams: c.servingSizeG ?? null,
            id: c.externalId,
          })),
          usda_skipped: result.usda_skipped ?? false,
          fallback_recommended: result.fallback_recommended,
          hint: result.fallback_recommended
            ? "No database match — estimate calories from your knowledge, then log_food."
            : "Pick the best match, scale to the user's portion, state your estimate briefly, then log_food.",
        };
      },
    }),

    log_food: tool({
      description:
        "Log a food/drink item the user ate, with your best calorie estimate. " +
        "Call lookup_food first when a database match is plausible. Only call this AFTER " +
        "you've resolved ambiguity (portion size, preparation, brand) and stated your estimate. " +
        "You can call it multiple times for a meal with several items.",
      inputSchema: z.object({
        description: z
          .string()
          .describe("Short human label, e.g. '2 scrambled eggs' or 'latte, oat milk'"),
        calories: z.number().int().describe("Your best total calorie estimate for this item"),
        meal: mealEnum.optional().describe("Which meal this belongs to, if known"),
        eaten_on: z
          .string()
          .optional()
          .describe("Date YYYY-MM-DD; omit for today"),
      }),
      execute: async ({ description, calories, meal, eaten_on }) => {
        const safeEatenOn = safeDate(eaten_on);
        await logFood({ profileId, description, calories, meal, eaten_on: safeEatenOn, source: "chat" });
        const summary = await getDailySummary(profileId, safeEatenOn);
        return {
          logged: { description, calories, meal: meal ?? null },
          day_total: summary.total,
          limit: summary.limit,
          remaining: summary.remaining,
        };
      },
    }),

    log_weight: tool({
      description:
        "Record the user's body weight for a day. Upserts (one weigh-in per day).",
      inputSchema: z.object({
        weight: z.number().describe(`Weight value in the given unit (default ${unitLabel})`),
        unit: z.enum(["lb", "kg"]).optional().describe("Unit of the weight value"),
        recorded_on: z.string().optional().describe("Date YYYY-MM-DD; omit for today"),
      }),
      execute: async ({ weight, unit, recorded_on }) => {
        const sys = unitFromArg(unit, system);
        const weight_kg = displayToKg(weight, sys);
        const safeRecordedOn = safeDate(recorded_on);
        await logWeight({ profileId, weight_kg, recorded_on: safeRecordedOn });
        return {
          recorded: { weight, unit: unit ?? unitLabel },
          recorded_on: safeRecordedOn,
        };
      },
    }),

    update_settings: tool({
      description:
        "Update the user's goal weight, daily calorie limit, or unit system.",
      inputSchema: z.object({
        goal_weight: z.number().optional().describe("Goal body weight in the given unit"),
        goal_weight_unit: z.enum(["lb", "kg"]).optional(),
        daily_calorie_limit: z.number().int().optional(),
        unit_system: z.enum(["imperial", "metric"]).optional(),
      }),
      execute: async (args) => {
        const patch: Record<string, unknown> = {};
        if (args.goal_weight != null) {
          const sys = unitFromArg(args.goal_weight_unit, system);
          patch.goal_weight_kg = displayToKg(args.goal_weight, sys);
        }
        if (args.daily_calorie_limit != null)
          patch.daily_calorie_limit = args.daily_calorie_limit;
        if (args.unit_system != null) patch.unit_system = args.unit_system;
        const next = await updateSettings(profileId, patch);
        return {
          updated: true,
          goal_weight: next.goal_weight_kg
            ? roundWeight(kgToDisplay(next.goal_weight_kg, next.unit_system))
            : null,
          daily_calorie_limit: next.daily_calorie_limit,
          unit_system: next.unit_system,
        };
      },
    }),

    get_daily_summary: tool({
      description:
        "Get the calorie total, limit, remaining calories, and every logged item for a day. " +
        "Omit date for today, or pass YYYY-MM-DD for yesterday or any recent day. " +
        "Use this for 'how much left today?', AND when the user wants the same meal as a prior day — " +
        "fetch that date, list matching items (meal tag only, never infer), ask for confirmation, " +
        "then log_food after they confirm.",
      inputSchema: z.object({
        date: z
          .string()
          .optional()
          .describe("Date YYYY-MM-DD; omit for today, use yesterday's date for 'last night'"),
      }),
      execute: async ({ date }) => {
        const s = await getDailySummary(profileId, date);
        return {
          date: s.date,
          total: s.total,
          limit: s.limit,
          remaining: s.remaining,
          items: s.entries.map((e) => ({
            id: e.id,
            description: e.description,
            calories: e.calories,
            meal: e.meal,
          })),
        };
      },
    }),

    edit_food_entry: tool({
      description:
        "Correct a previously logged item by id, or by a description match for today " +
        "(e.g. user says 'the bagel was actually 450'). Provide whichever fields change.",
      inputSchema: z.object({
        id: z.string().optional(),
        match_description: z
          .string()
          .optional()
          .describe("Used to find today's entry when no id is known"),
        description: z.string().optional(),
        calories: z.number().int().optional(),
        meal: mealEnum.optional(),
      }),
      execute: async (args) => {
        const found = await findFoodEntry(profileId, {
          id: args.id,
          description: args.match_description,
        });
        if (!found) return { error: "No matching entry found." };
        await editFoodEntry(profileId, found.id, {
          description: args.description,
          calories: args.calories,
          meal: args.meal,
        });
        const summary = await getDailySummary(profileId, found.eaten_on);
        return { edited_id: found.id, day_total: summary.total, remaining: summary.remaining };
      },
    }),

    delete_food_entry: tool({
      description: "Remove a logged item by id, or by a description match for today.",
      inputSchema: z.object({
        id: z.string().optional(),
        match_description: z.string().optional(),
      }),
      execute: async (args) => {
        const found = await findFoodEntry(profileId, {
          id: args.id,
          description: args.match_description,
        });
        if (!found) return { error: "No matching entry found." };
        await deleteFoodEntry(profileId, found.id);
        const summary = await getDailySummary(profileId, found.eaten_on);
        return { deleted_id: found.id, day_total: summary.total, remaining: summary.remaining };
      },
    }),

    get_progress: tool({
      description:
        "Get weight trend, average daily calories, AND a projected goal date " +
        "(estimated from the weigh-in trend) to answer 'how am I doing?' or " +
        "'when will I hit my goal?'.",
      inputSchema: z.object({}),
      execute: async () => {
        const [settings, weights, calories] = await Promise.all([
          getSettings(profileId),
          getWeightSeries(profileId, 365),
          getCalorieSeries(profileId, 14),
        ]);
        const toDisp = (kg: number) =>
          roundWeight(kgToDisplay(kg, settings.unit_system));
        const unit = weightUnitLabel(settings.unit_system);
        const first = weights[0];
        const last = weights[weights.length - 1];
        const avgCalories =
          calories.length > 0
            ? Math.round(
                calories.reduce((s, d) => s + d.total, 0) / calories.length,
              )
            : null;

        const goalDisp = settings.goal_weight_kg
          ? toDisp(settings.goal_weight_kg)
          : null;
        const f = forecastGoal(
          weights.map((w) => ({ date: w.recorded_on, value: toDisp(w.weight_kg) })),
          goalDisp,
          settings.start_weight_kg ? toDisp(settings.start_weight_kg) : null,
        );

        return {
          unit,
          goal_weight: goalDisp,
          daily_calorie_limit: settings.daily_calorie_limit,
          latest_weight: last ? toDisp(last.weight_kg) : null,
          first_recorded_weight: first ? toDisp(first.weight_kg) : null,
          change:
            first && last ? toDisp(last.weight_kg) - toDisp(first.weight_kg) : null,
          weigh_ins: weights.length,
          avg_daily_calories_14d: avgCalories,
          goal_forecast: f
            ? {
                status: f.status, // on_track | reached | stalled | diverging | insufficient
                projected_date: f.etaDate, // YYYY-MM-DD or null
                days_remaining: f.daysRemaining,
                weeks_remaining: f.weeksRemaining,
                rate_per_week: f.ratePerWeek, // signed; negative = losing
                unit_per_week: unit,
              }
            : null,
        };
      },
    }),
  };
}
