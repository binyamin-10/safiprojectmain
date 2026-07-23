"use client";

import type { TabType } from "@/types/admin";
import type { Session } from "next-auth";

interface AdminHeaderProps {
  activeTab: TabType;
  session: Session | null;
}

export default function AdminHeader({ activeTab, session }: AdminHeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/40 backdrop-blur-md h-16 flex items-center justify-between px-6 shrink-0">
      <div>
        <h2 className="font-extrabold text-base text-slate-100 capitalize">
          {activeTab.replace(/-/g, ' ')}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end leading-none text-right">
          <span className="text-xs font-bold text-slate-100">
            {session?.user?.name || "Faculty Administrator"}
          </span>
          <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
            {(session?.user as any)?.email || "admin@safiproject.com"}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center font-bold text-rose-400 text-xs">
          {(session?.user?.name || "A")[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}
