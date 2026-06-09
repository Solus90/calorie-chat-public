"use client";

import { useEffect, useId, useRef } from "react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    cancelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-ink/40" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full min-w-0 max-w-sm animate-rise rounded-xl border border-hairline bg-surface p-5 shadow-[0_1px_2px_rgba(17,24,39,0.06),0_8px_24px_-12px_rgba(17,24,39,0.12)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id={titleId}
          className="font-display text-pretty text-lg uppercase tracking-wide sm:text-xl"
        >
          {title}
        </h2>
        <p className="mt-2 text-pretty text-sm text-ink-muted">{body}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-md px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:text-ink sm:min-h-0 sm:py-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-soft sm:min-h-0 sm:py-2"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
