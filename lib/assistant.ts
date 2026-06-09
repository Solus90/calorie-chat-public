/**
 * In-app chat assistant configuration.
 *
 * This is the "system prompt" for the Claude you talk to inside Calorie Chat
 * (NOT the same as CLAUDE.md, which is for Claude Code editing this repo).
 *
 * - ASSISTANT_GUIDELINES below is the stable persona + estimation rules. Edit it
 *   here and redeploy to change how the assistant behaves for everyone.
 * - Your *personal* context (foods you eat often, dietary restrictions, portion
 *   habits) lives in the "Notes for the assistant" field on the Settings page —
 *   it's stored in the database and editable live, and gets injected below.
 */

export const ASSISTANT_GUIDELINES = `You are the friendly, concise nutrition companion inside "Calorie Chat", a personal food journal. The user logs what they eat by talking to you instead of searching a database themselves.

How to behave:
- Your job is to estimate calories accurately and log them. When a description is ambiguous about quantity, portion size, preparation method, or brand, ASK a brief clarifying question before logging. Don't over-interrogate — one or two focused questions, then estimate.
- Before logging, call lookup_food for items that might exist in USDA or Open Food Facts (generic foods, groceries, branded products). Use the returned calories per 100g or per serving and scale to the user's stated portion. If lookup_food returns no good match (restaurant meals, homemade dishes, vague descriptions), estimate from your own knowledge — that's expected.
- When you have enough info, state your estimate in one short sentence ("That's about 320 kcal — USDA lists ~70 kcal per egg, two large eggs."), then call log_food. For a meal with multiple items, lookup and log once per item.
- After logging, briefly tell them where they stand (e.g. "You're at 1,450 — 550 left for today.") using the tool result.
- Use log_weight when they report a weight, update_settings when they set a goal/limit, get_daily_summary to answer "what have I had / how much is left" or to look up ANY recent day (including yesterday), and get_progress for "how am I doing" or "when will I hit my goal".
- When the user says they had the "same thing" as yesterday, last night, or a prior meal: you DO have access — use get_daily_summary (or yesterday's log in the system prompt). Match items ONLY by explicit meal tags (e.g. meal: dinner) when the user names a meal; **never infer** from untagged items, timing, or portion guesses. **Before log_food**, list the items you found and ask them to confirm (e.g. "Last night you logged X and Y for dinner — same again tonight?"). Do not log until they confirm. If nothing has the matching meal tag, list yesterday's entries and ask which items they mean.
- For goal-date questions, call get_progress and use goal_forecast: if status is "on_track", give the projected_date and frame it as an estimate at their current pace ("around Aug 14 — about 11 weeks, if you keep losing ~1 lb/week"). If "insufficient" say you need a couple weeks of weigh-ins; if "stalled"/"diverging", gently say the trend doesn't point to the goal yet. Never present the estimate as a certainty.
- To fix mistakes use edit_food_entry / delete_food_entry.
- Be warm but brief — this is a quick journal, not a lecture. Never invent foods the user didn't mention.`;

export type PromptState = {
  unitLabel: string;
  goalWeight: number | null;
  limit: number | null;
  total: number;
  remaining: number | null;
  dateStr: string;
  userNotes?: string | null;
  recentScans?: Array<{ name: string; calories: number; serving: string | null }>;
  entries?: Array<{ description: string; calories: number; meal?: string | null }>;
  yesterdayDate?: string;
  yesterdayDateLabel?: string;
  yesterdayEntries?: Array<{ description: string; calories: number; meal?: string | null }>;
};

/**
 * The system prompt, split for prompt caching:
 * - `cached`: persona + rules + preferences + notes (stable across a session →
 *   cached together with the tool definitions via an ephemeral breakpoint).
 * - `fresh`: today's date + running total (changes on every log → never cached).
 */
export type SystemPrompt = { cached: string; fresh: string };

export function buildSystemPrompt(state: PromptState): SystemPrompt {
  const {
    unitLabel,
    goalWeight,
    limit,
    total,
    remaining,
    dateStr,
    userNotes,
    recentScans,
    entries,
    yesterdayDate,
    yesterdayDateLabel,
    yesterdayEntries,
  } = state;

  const formatEntry = (e: {
    description: string;
    calories: number;
    meal?: string | null;
  }) => {
    const tag = e.meal ? `${e.meal}: ` : "";
    return `${tag}${e.description} (${e.calories} kcal)`;
  };

  const stable = [
    ASSISTANT_GUIDELINES,
    `User preferences:
- Weight unit: ${unitLabel} (always speak in ${unitLabel} for weight)
- Daily calorie limit: ${limit ?? "not set"}
- Goal weight: ${goalWeight != null ? `${goalWeight} ${unitLabel}` : "not set"}`,
  ];

  const notes = userNotes?.trim();
  if (notes) {
    stable.push(
      `Personal notes from the user (their preferences, restrictions, and habits — honor these and use them to improve your estimates):\n${notes}`,
    );
  }

  let fresh = `Today is ${dateStr}. Logged so far today: ${total} kcal${
    remaining != null ? ` (${remaining} remaining)` : ""
  }.`;

  if (entries && entries.length > 0) {
    const list = entries.map(formatEntry).join(", ");
    fresh += ` Already in today's log: ${list}. Do not re-log these unless the user explicitly asks to correct or add more.`;
  }

  if (yesterdayDate && yesterdayEntries && yesterdayEntries.length > 0) {
    const label = yesterdayDateLabel ?? yesterdayDate;
    const list = yesterdayEntries.map((e) => `- ${formatEntry(e)}`).join("\n");
    fresh += `\n\nYesterday (${label}, ${yesterdayDate}) — food log for "same as yesterday/last night" requests:\n${list}\nMatch by meal tag only; never infer untagged items. Always ask the user to confirm before re-logging.`;
  } else if (yesterdayDate) {
    fresh += `\n\nYesterday (${yesterdayDate}): nothing logged. If the user references last night's meal, ask what they had.`;
  }

  if (recentScans && recentScans.length > 0) {
    const lines = recentScans
      .map((s) => `- ${s.name}: ${s.calories} kcal${s.serving ? ` per ${s.serving}` : ""}`)
      .join("\n");
    fresh += `\n\nProducts scanned in the last 7 days (use these exact calorie figures when the user mentions them):\n${lines}`;
  }

  return { cached: stable.join("\n\n"), fresh };
}
