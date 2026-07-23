"use client";

import { MessageSquare } from "lucide-react";
import type { StudentIssue } from "@/types/admin";

interface StudentIssuesTabProps {
  issues: StudentIssue[];
  onResolve: (id: string) => void;
}

export default function StudentIssuesTab({ issues, onResolve }: StudentIssuesTabProps) {
  const pendingCount = issues.filter(i => i.status === "PENDING").length;

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-extrabold text-lg text-slate-200 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-rose-400" />
            Student Support Tickets
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            View and manage problems reported by students regarding OCR scanning, uploads, and data discrepancies.
          </p>
        </div>
        <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1 rounded-xl text-xs font-bold">
          {pendingCount} Unresolved
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-900/60 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-700">
              <th className="p-3.5 w-24">Date</th>
              <th className="p-3.5 w-32">Reg No</th>
              <th className="p-3.5 w-40">Student</th>
              <th className="p-3.5 min-w-[200px]">Subject</th>
              <th className="p-3.5 min-w-[300px]">Description</th>
              <th className="p-3.5 text-center w-28">Status</th>
              <th className="p-3.5 text-center w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {issues.map(issue => (
              <tr key={issue.id} className="border-b border-slate-800/30 last:border-0 hover:bg-slate-800/10 transition-colors">
                <td className="p-3.5 text-slate-400 font-medium whitespace-nowrap">
                  {new Date(issue.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3.5 font-semibold text-indigo-400 whitespace-nowrap">{issue.registerNo}</td>
                <td className="p-3.5 text-slate-200 font-bold">{issue.studentName}</td>
                <td className="p-3.5 text-slate-100 font-semibold">{issue.subject}</td>
                <td className="p-3.5 text-slate-400 max-w-sm truncate" title={issue.description}>
                  {issue.description}
                </td>
                <td className="p-3.5 text-center">
                  {issue.status === "RESOLVED" ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-bold">
                      Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-bold animate-pulse">
                      Pending
                    </span>
                  )}
                </td>
                <td className="p-3.5 text-center">
                  <button
                    onClick={() => onResolve(issue.id)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                      issue.status === "RESOLVED"
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        : "bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-transparent"
                    }`}
                  >
                    {issue.status === "RESOLVED" ? "Reopen" : "Resolve"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
