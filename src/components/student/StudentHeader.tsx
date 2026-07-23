"use client";

import { signOut } from "next-auth/react";
import { GraduationCap, LogOut, Printer, BookOpen } from "lucide-react";

interface StudentHeaderProps {
  isPrintView: boolean;
  onTogglePrintView: () => void;
}

export default function StudentHeader({ isPrintView, onTogglePrintView }: StudentHeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/40 backdrop-blur-md sticky top-0 z-30 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <span className="font-bold text-sm sm:text-lg text-slate-100 block leading-tight">Student Portal</span>
            <span className="text-[9px] sm:text-[10px] text-indigo-400 uppercase tracking-wider font-semibold block leading-none">
              BCA Honours
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onTogglePrintView}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm px-3.5 py-1.5 rounded-xl transition-all font-semibold"
          >
            {isPrintView ? (
              <>
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">View Dashboard</span>
                <span className="inline sm:hidden">Dashboard</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Generate Transcript</span>
                <span className="inline sm:hidden">Transcript</span>
              </>
            )}
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 text-rose-400 hover:text-white text-sm px-3.5 py-1.5 rounded-xl transition-all font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
