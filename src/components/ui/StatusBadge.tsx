"use client";

import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

type Status = "verified" | "pending" | "rejected";

interface StatusBadgeProps {
  status: Status;
  /** Optional additional className */
  className?: string;
}

const CONFIG: Record<Status, { label: string; cls: string; Icon: React.ElementType; pulse?: boolean }> = {
  verified: {
    label: "Verified",
    cls: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
    Icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    cls: "bg-amber-500/10 border border-amber-500/20 text-amber-400",
    Icon: Clock,
    pulse: true,
  },
  rejected: {
    label: "Rejected",
    cls: "bg-rose-500/10 border border-rose-500/20 text-rose-400",
    Icon: AlertTriangle,
  },
};

/** Reusable Verified / Pending / Rejected pill — used in both admin and student portals */
export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const { label, cls, Icon, pulse } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls} ${className}`}
    >
      <Icon className={`w-3 h-3 ${pulse ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}
