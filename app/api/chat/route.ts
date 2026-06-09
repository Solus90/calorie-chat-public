import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  generateId,
  type UIMessage,
  type SystemModelMessage,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildTools } from "@/lib/tools";
import { buildSystemPrompt } from "@/lib/assistant";
import { getDailySummary, getRecentScans, getSettings } from "@/lib/queries";
import { getActiveProfileId } from "@/lib/profile";
import { addDays, formatLongDate, todayInAppTz } from "@/lib/timezone";
import { getSupabase } from "@/lib/supabase";
import { kgToDisplay, roundWeight, weightUnitLabel } from "@/lib/units";

export const maxDuration = 60;

// Cost control: only send the recent slice of the conversation to the model.
// The assistant gets the running daily total from the system prompt + tools, so
// it doesn't need the whole transcript — this keeps per-message cost flat as the
// journal grows.
const MAX_MODEL_MESSAGES = 12;

function trimForModel(msgs: UIMessage[]): UIMessage[] {
  if (msgs.length <= MAX_MODEL_MESSAGES) return msgs;
  let slice = msgs.slice(-MAX_MODEL_MESSAGES);
  // The model request must begin on a user message.
  const firstUser = slice.findIndex((m) => m.role === "user");
  if (firstUser > 0) {
    slice = slice.slice(firstUser);
  } else if (firstUser === -1) {
    const lastUser = msgs.map((m) => m.role).lastIndexOf("user");
    slice = lastUser >= 0 ? msgs.slice(lastUser) : slice;
  }
  return slice;
}

async function persistMessage(profileId: string, msg: UIMessage) {
  try {
    const sb = getSupabase();
    await sb.from("chat_messages").upsert(
      {
        id: msg.id,
        profile_id: profileId,
        role: msg.role,
        parts: msg.parts,
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch {
    // Persistence is best-effort; never block the chat on it.
  }
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const profileId = await getActiveProfileId();
  const today = todayInAppTz();
  const yesterday = addDays(today, -1);
  const [settings, summary, yesterdaySummary, recentScans] = await Promise.all([
    getSettings(profileId),
    getDailySummary(profileId),
    getDailySummary(profileId, yesterday),
    getRecentScans(profileId),
  ]);

  const unitLabel = weightUnitLabel(settings.unit_system);
  const goalWeight =
    settings.goal_weight_kg != null
      ? roundWeight(kgToDisplay(settings.goal_weight_kg, settings.unit_system))
      : null;

  const { cached, fresh } = buildSystemPrompt({
    unitLabel,
    goalWeight,
    limit: settings.daily_calorie_limit,
    total: summary.total,
    remaining: summary.remaining,
    entries: summary.entries,
    yesterdayDate: yesterday,
    yesterdayDateLabel: formatLongDate(yesterday),
    yesterdayEntries: yesterdaySummary.entries,
    userNotes: settings.assistant_notes,
    recentScans,
    dateStr: formatLongDate(today),
  });

  // Prompt caching: the ephemeral breakpoint on the stable block caches the tool
  // definitions + persona/preferences together (the tools precede it in the
  // request prefix). The volatile day-state block stays uncached.
  const system: SystemModelMessage[] = [
    {
      role: "system",
      content: cached,
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    },
    { role: "system", content: fresh },
  ];

  // Persist the newest incoming user message.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser) await persistMessage(profileId, lastUser);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system,
    messages: await convertToModelMessages(trimForModel(messages)),
    tools: buildTools(settings.unit_system, profileId),
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse({
    generateMessageId: generateId,
    onFinish: ({ responseMessage }) => {
      if (responseMessage) void persistMessage(profileId, responseMessage);
    },
  });
}
