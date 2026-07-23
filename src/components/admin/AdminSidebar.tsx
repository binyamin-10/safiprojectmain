"use client";

import { signOut } from "next-auth/react";
import {
  GraduationCap, LogOut, Users, LayoutDashboard, Table2,
  Briefcase, MessageSquare, Award, ChevronDown
} from "lucide-react";
import type { TabType, Student, StudentIssue } from "@/types/admin";

interface AdminSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedBatch: string;
  onBatchChange: (batch: string) => void;
  uniqueBatches: string[];
  students: Student[];
  totalPendingInternships: number;
  pendingIssueCount: number;
  subjectsLoaded: boolean;
  onResultAnalysisOpen: () => void;
}

export default function AdminSidebar({
  activeTab, onTabChange, selectedBatch, onBatchChange,
  uniqueBatches, students, totalPendingInternships,
  pendingIssueCount, subjectsLoaded, onResultAnalysisOpen,
}: AdminSidebarProps) {

  const navItem = (tab: TabType, Icon: React.ElementType, label: string, badge?: number) => (
    <button
      key={tab}
      onClick={() => {
        onTabChange(tab);
        if (tab === 'result-analysis' && !subjectsLoaded) onResultAnalysisOpen();
      }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
        activeTab === tab
          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          : 'hover:bg-slate-900/30 text-slate-400 hover:text-slate-200'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-bold">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <aside className="w-52 shrink-0 flex flex-col h-screen bg-slate-950/60 border-r border-slate-800 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 p-5 border-b border-slate-800 shrink-0">
        <div className="w-9 h-9 bg-emerald-600/20 border border-emerald-500/30 rounded-xl flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <span className="font-bold text-sm text-slate-100 block leading-tight">Faculty Admin</span>
          <span className="text-[9px] text-rose-400 uppercase tracking-wider font-semibold block mt-0.5 leading-none">
            BCA Dept Portal
          </span>
        </div>
      </div>

      {/* Batch Filter */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/10">
        <label className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block mb-1.5 px-1">
          Selected Batch
        </label>
        <div className="relative">
          <Users className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
          <select
            value={selectedBatch}
            onChange={(e) => onBatchChange(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-1.5 pl-8 pr-7 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors appearance-none cursor-pointer font-semibold"
          >
            <option value="All">All FYUGP Batches</option>
            {uniqueBatches.map(b => (
              <option key={b} value={b} className="bg-slate-950 text-slate-100">{b}</option>
            ))}
            {students.some(s => !s.batch) && (
              <option value="Legacy" className="bg-slate-950 text-slate-100">Legacy / No Batch</option>
            )}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItem('dashboard', LayoutDashboard, 'Dashboard')}
        {navItem('result-analysis', Table2, 'Result Analysis')}
        {navItem('internships', Briefcase, 'Internships', totalPendingInternships)}
        <button
          onClick={() => onTabChange('student-issues')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'student-issues'
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              : 'hover:bg-slate-900/30 text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>Student Issues</span>
          <span className="ml-auto text-[9px] bg-slate-900/60 border border-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded-full font-bold">
            {pendingIssueCount}
          </span>
        </button>
        {navItem('score-cards', Award, 'Scorecard Builder')}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 shrink-0">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl transition-all font-bold"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
