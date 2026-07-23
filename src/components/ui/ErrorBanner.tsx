"use client";

import { AlertTriangle } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

/** Reusable dismissable error alert — used by both admin and student portals */
export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm mb-6 print:hidden">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <span>{message}</span>
      <button
        className="ml-auto text-rose-300 font-bold hover:text-rose-100 transition-colors"
        onClick={onDismiss}
        aria-label="Dismiss error"
      >
        ✕
      </button>
    </div>
  );
}
