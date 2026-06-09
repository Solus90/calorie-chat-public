"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { mutate } from "swr";
import { BarcodeScanner } from "./BarcodeScanner";

const SUGGESTIONS = [
  "I had two scrambled eggs and buttered toast",
  "A grande oat milk latte",
  "How many calories do I have left?",
  "I weigh 182 today",
];

/** Pull plain text out of a UIMessage's parts. */
function messageText(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** Render a small confirmation pill for completed tool calls. */
function ToolPill({ part }: { part: { type: string; output?: unknown } }) {
  const name = part.type.replace(/^tool-/, "");
  const out = part.output as
    | {
        logged?: { description?: string; calories?: number };
        recorded?: { weight?: number; unit?: string };
        deleted_id?: string;
        edited_id?: string;
        updated?: boolean;
      }
    | undefined;

  let tag: string | null = null;
  let label = "";
  if (name === "log_food" && out?.logged) {
    tag = "Logged";
    label = `${out.logged.description} · ${out.logged.calories} kcal`;
  } else if (name === "log_weight" && out?.recorded) {
    tag = "Weight";
    label = `${out.recorded.weight} ${out.recorded.unit ?? ""}`.trim();
  } else if (name === "delete_food_entry" && out?.deleted_id) {
    tag = "Removed";
    label = "item deleted";
  } else if (name === "edit_food_entry" && out?.edited_id) {
    tag = "Updated";
    label = "item edited";
  } else if (name === "update_settings" && out?.updated) {
    tag = "Saved";
    label = "goal updated";
  }
  if (!tag) return null;

  return (
    <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-md border border-olive/35 bg-olive/10 px-2.5 py-1 text-xs text-olive">
      <span className="label-mono text-[0.6rem] text-olive">{tag}</span>
      <span className="font-mono">{label}</span>
    </span>
  );
}

export function ChatPanel({ initialMessages }: { initialMessages: UIMessage[] }) {
  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: () => {
      mutate(
        (key): key is string => typeof key === "string" && key.startsWith("/api/today"),
        undefined,
        { revalidate: true },
      );
      mutate("/api/progress", undefined, { revalidate: true });
    },
  });

  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  async function handleScan(code: string) {
    setScanning(false);
    setLookingUp(true);
    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.found && data.description) {
        const kcal = data.calories != null ? `, ${data.calories} kcal` : "";
        setInput(`I had ${data.description}${kcal}`);
      } else {
        setInput("I had ");
      }
    } catch {
      setInput("I had ");
    }
    setLookingUp(false);
  }

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (isMobile) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, status, isMobile]);

  function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const empty = messages.length === 0;

  const composer = (
    <div className="mx-auto flex min-w-0 max-w-2xl items-end gap-2">
      <textarea
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Tell me what you ate…"
        className="max-h-40 min-h-11 flex-1 resize-none rounded-md border border-hairline bg-paper px-4 py-3 text-ink outline-none transition focus:border-clay focus:ring-2 focus:ring-clay/25"
      />
      {/* Barcode scan button */}
      <button
        type="button"
        onClick={() => setScanning(true)}
        disabled={busy || lookingUp}
        title="Scan barcode"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper text-ink-muted transition hover:border-accent hover:text-accent disabled:opacity-40"
      >
        {lookingUp ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="8" x2="7" y2="16" />
            <line x1="10" y1="8" x2="10" y2="16" />
            <line x1="13" y1="8" x2="13" y2="16" />
            <line x1="16" y1="8" x2="16" y2="16" />
          </svg>
        )}
      </button>
      <button
        onClick={() => send(input)}
        disabled={busy || !input.trim()}
        className="h-11 shrink-0 rounded-md bg-accent px-5 font-semibold text-white transition enabled:hover:bg-accent-soft disabled:opacity-40"
      >
        Send
      </button>
    </div>
  );

  return (
    <>
    {scanning && <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-hairline bg-surface shadow-[0_1px_2px_rgba(17,24,39,0.06),0_8px_24px_-12px_rgba(17,24,39,0.12)]">
      {/* Composer — top on mobile, bottom on desktop */}
      <div className="order-1 shrink-0 border-b border-hairline p-3 lg:order-2 lg:border-b-0 lg:border-t sm:p-4">
        {composer}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="order-2 min-w-0 flex-1 overflow-y-auto px-4 py-4 lg:order-1 sm:px-7 sm:py-6"
      >
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="font-display text-2xl text-ink">
              What did you eat?
            </p>
            <p className="mt-2 max-w-xs text-sm text-ink-muted">
              Describe it however you like — I&apos;ll ask if I need details, then
              estimate and log the calories for you.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border border-hairline bg-paper px-3 py-1.5 text-sm text-ink transition hover:border-accent hover:text-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex min-w-0 max-w-2xl flex-col gap-4">
            {isMobile && status === "submitted" && (
              <div className="flex items-start">
                <div className="rounded-lg rounded-bl-sm border border-hairline bg-paper-deep px-4 py-3">
                  <span className="dot inline-block h-2 w-2 rounded-full bg-ink-muted" />
                  <span className="dot mx-1 inline-block h-2 w-2 rounded-full bg-ink-muted" />
                  <span className="dot inline-block h-2 w-2 rounded-full bg-ink-muted" />
                </div>
              </div>
            )}
            {(isMobile ? [...messages].reverse() : messages).map((m) => {
              const text = messageText(m);
              const toolParts = m.parts.filter((p) =>
                p.type.startsWith("tool-"),
              );
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`animate-msg flex flex-col ${
                    isUser ? "items-end" : "items-start"
                  }`}
                >
                  {text && (
                    <div
                      className={`max-w-[85%] wrap-break-word whitespace-pre-wrap rounded-lg px-4 py-2.5 text-[0.95rem] leading-relaxed ${
                        isUser
                          ? "rounded-br-sm bg-clay text-white"
                          : "rounded-bl-sm border border-hairline bg-paper-deep text-ink"
                      }`}
                    >
                      {text}
                    </div>
                  )}
                  {toolParts.map((p, i) => (
                    <ToolPill key={i} part={p as { type: string; output?: unknown }} />
                  ))}
                </div>
              );
            })}
            {!isMobile && status === "submitted" && (
              <div className="flex items-start">
                <div className="rounded-lg rounded-bl-sm border border-hairline bg-paper-deep px-4 py-3">
                  <span className="dot inline-block h-2 w-2 rounded-full bg-ink-muted" />
                  <span className="dot mx-1 inline-block h-2 w-2 rounded-full bg-ink-muted" />
                  <span className="dot inline-block h-2 w-2 rounded-full bg-ink-muted" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
