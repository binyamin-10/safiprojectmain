"use client";

import { signOut } from "next-auth/react";
import { LogOut, Printer, FileText, Award, ExternalLink, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { StudentData, SemesterReport } from "@/types/student";

interface StudentDashboardTabProps {
  student: StudentData;
  overallCgpa: number;
  totalCreditsCompleted: number;
  creditCompletionPercent: number;
  chartData: { name: string; SGPA: number; CGPA: number }[];
}

const HONOURS_TARGET = 160;

function SemesterStatusItem({ sem, num }: { sem: SemesterReport | undefined; num: number }) {
  return (
    <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-sm">
      <div>
        <span className="font-semibold text-slate-200">Semester {num}</span>
        {sem && (
          <span className="text-[11px] text-slate-400 block max-w-[140px] truncate">
            {sem.fileName || "Uploaded marksheet"}
          </span>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        {sem ? (
          <>
            <div className="flex items-center gap-1.5">
              {sem.isRejected ? (
                <span className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" /> Rejected
                </span>
              ) : sem.isVerified ? (
                <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending
                </span>
              )}
            </div>
            {sem.fileUrl && (
              <a
                href={`/api/view-file?url=${encodeURIComponent(sem.fileUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                <ExternalLink className="w-3 h-3" /> View PDF
              </a>
            )}
          </>
        ) : (
          <span className="text-xs text-slate-500">Not Uploaded</span>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboardTab({
  student, overallCgpa, totalCreditsCompleted, creditCompletionPercent, chartData,
}: StudentDashboardTabProps) {
  const uploadedSemesters = student.semesters;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Profile card */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Academic Profile</span>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight mt-0.5">{student.name}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 mt-1.5 text-xs">
            <span>Register No: <strong>{student.registerNo}</strong></span>
            <span className="text-slate-600">•</span>
            <span>BCA Honours Program</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full mt-4 sm:flex sm:w-auto sm:items-center sm:gap-2 sm:mt-0">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2.5 sm:py-2 rounded-xl transition-all font-semibold shadow-md w-full sm:w-auto"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Transcript</span>
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center justify-center gap-1.5 bg-rose-600/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/25 text-xs px-3.5 py-2.5 sm:py-2 rounded-xl transition-all font-semibold w-full sm:w-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        {[
          { label: "CGPA", value: overallCgpa.toFixed(3), color: "text-indigo-400" },
          { label: "Credits", value: totalCreditsCompleted, color: "text-emerald-400" },
          { label: "Progress", value: `${creditCompletionPercent}%`, color: "text-rose-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
            <span className={`text-lg sm:text-2xl font-black mt-1 ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* SGPA Progress Chart */}
      {chartData.length > 0 && (
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="font-bold text-base text-slate-200 mb-4">SGPA / CGPA Progression</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="SGPA" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="CGPA" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Honours Tracker */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="font-bold text-base text-slate-200 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-400" />
          BCA Honors Progress
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Total Completed Credits:</span>
            <span className="font-bold text-emerald-400">{totalCreditsCompleted} / {HONOURS_TARGET}</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-800 overflow-hidden">
            <div
              className="bg-linear-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${creditCompletionPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 bg-slate-950/40 border border-slate-800/60 p-3 rounded-xl leading-relaxed">
            💡 BCA Honors curriculum requires a minimum of 160 credits across 8 semesters with no active failed backlogs to receive honors classification.
          </p>
        </div>
      </div>

      {/* Semester Status Log */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="font-bold text-base text-slate-200 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          Semester Status Log
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
            <SemesterStatusItem
              key={num}
              num={num}
              sem={uploadedSemesters.find(r => r.semesterNumber === num)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
