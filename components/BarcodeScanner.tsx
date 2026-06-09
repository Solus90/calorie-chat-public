"use client";

import { useEffect, useRef, useState } from "react";

type BarcodeScannerProps = {
  onScan: (code: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let stopControls: (() => void) | null = null;

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        // Prefer rear camera on mobile
        const device =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ??
          devices[0];

        if (!device) {
          setError("No camera found.");
          return;
        }

        const controls = await reader.decodeFromVideoDevice(
          device.deviceId,
          videoRef.current!,
          (result, err) => {
            if (stopped) return;
            if (result) {
              stopped = true;
              controls?.stop();
              onScan(result.getText());
            } else if (
              err &&
              !(err instanceof Error && err.name === "NotFoundException")
            ) {
              console.error("Scan error:", err);
            }
          },
        );
        stopControls = () => controls?.stop();
      } catch (e) {
        if (!stopped) setError("Could not access camera. Check permissions.");
        console.error(e);
      }
    }

    start();

    return () => {
      stopped = true;
      stopControls?.();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Video feed */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        {/* Targeting overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-48 w-72">
            {/* Corner brackets */}
            {[
              "top-0 left-0 border-t-4 border-l-4 rounded-tl-md",
              "top-0 right-0 border-t-4 border-r-4 rounded-tr-md",
              "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-md",
              "bottom-0 right-0 border-b-4 border-r-4 rounded-br-md",
            ].map((cls, i) => (
              <div
                key={i}
                className={`absolute h-8 w-8 border-accent ${cls}`}
              />
            ))}
            {/* Scan line */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-accent/70" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rust/90 px-4 py-2 text-center text-sm text-white">
          {error}
        </div>
      )}

      <div className="shrink-0 bg-black/80 px-4 py-6 text-center">
        <p className="mb-4 text-sm text-white/70">
          Point at a barcode to scan
        </p>
        <button
          onClick={onClose}
          className="rounded-md border border-white/30 px-8 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
