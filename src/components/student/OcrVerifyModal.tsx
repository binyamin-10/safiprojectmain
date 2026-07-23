"use client";

import { X, AlertTriangle, Save } from "lucide-react";
import type { OcrData } from "@/types/student";

interface OcrVerifyModalProps {
  ocrData: OcrData;
  showGrievanceInput: boolean;
  grievanceText: string;
  onClose: () => void;
  onToggleGrievance: () => void;
  onGrievanceTextChange: (text: string) => void;
  onGradeChange: (index: number, newGrade: string) => void;
  onSave: () => void;
}

const AVAILABLE_GRADES = ["O", "A+", "A", "B+", "B", "C", "P", "F"];

export default function OcrVerifyModal({
  ocrData, showGrievanceInput, grievanceText,
  onClose, onToggleGrievance, onGrievanceTextChange, onGradeChange, onSave
}: OcrVerifyModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="glass-panel w-full max-w-3xl rounded-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-700/80">
        
        {/* Header */}
        <div className="bg-slate-900/60 p-3.5 sm:p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-slate-100">Verify Scan: Semester {ocrData.semester}</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Confirm extracted details for <strong>{/* ocrData doesn't store name/reg internally in the new type, we'll just say "this student" or pass it in. For simplicity, just general text: */}this marksheet</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 flex-1 scrollbar-hide">
          <div className="flex items-center gap-2.5 sm:gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-2.5 sm:p-3 rounded-xl text-[10px] sm:text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>
              <strong>OCR extraction may contain slight spelling errors.</strong> Please verify that each course code and grade matches your original paper. You can correct the grades directly below. If there is a larger mistake, use the <strong>Report Mistake</strong> button.
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="border border-slate-800 rounded-xl overflow-hidden hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[450px]">
              <thead>
                <tr className="bg-slate-900 text-xs text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                  <th className="p-3 w-28">Subject Code</th>
                  <th className="p-3">Subject Name</th>
                  <th className="p-3 text-center w-20">Credits</th>
                  <th className="p-3 text-center w-24">Grade</th>
                </tr>
              </thead>
              <tbody>
                {ocrData.subjects.map((sub, idx) => (
                  <tr key={idx} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10">
                    <td className="p-3 font-semibold text-indigo-400 text-sm">{sub.subjectCode || sub.code}</td>
                    <td className="p-3 text-xs leading-normal">{sub.subjectName?.split(" - ")[1] || sub.subjectName || sub.name || "Unknown"}</td>
                    <td className="p-3 text-center text-sm">{sub.credits?.toFixed(1) || "-"}</td>
                    <td className="p-3 text-center">
                      <select
                        value={sub.grade}
                        onChange={(e) => onGradeChange(idx, e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-indigo-400 font-extrabold text-xs px-2 py-1 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer w-full text-center appearance-none"
                      >
                        {AVAILABLE_GRADES.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View */}
          <div className="border border-slate-800 rounded-xl overflow-hidden flex sm:hidden flex-col divide-y divide-slate-800/40">
            {ocrData.subjects.map((sub, idx) => (
              <div key={idx} className="p-3 hover:bg-slate-800/10 flex flex-col gap-1.5">
                <div className="flex justify-between items-start">
                  <div className="font-semibold text-indigo-400 text-xs">{sub.subjectCode || sub.code}</div>
                  <select
                    value={sub.grade}
                    onChange={(e) => onGradeChange(idx, e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-indigo-400 font-extrabold text-[10px] px-2 py-0.5 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none text-center"
                  >
                    {AVAILABLE_GRADES.map(g => (
                      <option key={g} value={g}>Grade: {g}</option>
                    ))}
                  </select>
                </div>
                <div className="text-[11px] leading-snug text-slate-200">
                  {sub.subjectName?.split(" - ")[1] || sub.subjectName || sub.name || "Unknown"}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Credits: {sub.credits?.toFixed(1) || "-"}
                </div>
              </div>
            ))}
          </div>

          {/* SGPA Summary */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-slate-950/40 p-3.5 sm:p-4 border border-slate-800 rounded-xl">
            <div>
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold">Calculated SGPA</span>
              <p className="text-xl sm:text-2xl font-black text-indigo-400 mt-1">{ocrData.sgpa.toFixed(3)}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold">Overall Classification</span>
              <p className={`text-xl sm:text-2xl font-black mt-1 ${ocrData.overallGrade === 'F' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {ocrData.overallGrade}
              </p>
            </div>
          </div>

          {/* Grievance Report Field */}
          {showGrievanceInput && (
            <div className="p-3.5 sm:p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-1.5 sm:space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-400">
                Describe the Mistake or Grievance
              </label>
              <textarea
                rows={3}
                value={grievanceText}
                onChange={(e) => onGrievanceTextChange(e.target.value)}
                placeholder="Provide details about the incorrect grade or scanning issue here..."
                className="w-full bg-slate-950 border border-rose-500/25 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <div className="text-[10px] text-rose-400/80 italic">
                Note: Submitting this report flags the semester as pending review. Faculty will review your message and edit/approve the grades.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900/60 p-3 sm:p-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2.5 sm:justify-between sm:items-center shrink-0">
          <div className="w-full sm:w-auto">
            <button
              type="button"
              onClick={onToggleGrievance}
              className={`flex items-center justify-center gap-1.5 font-bold text-xs py-2.5 px-4 rounded-xl transition-all border w-full sm:w-auto ${
                showGrievanceInput
                  ? "bg-rose-600/10 border-rose-500/35 text-rose-400"
                  : "bg-amber-600/10 hover:bg-amber-600/20 border-amber-500/25 text-amber-400"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{showGrievanceInput ? "Cancel Report" : "Report Mistake"}</span>
            </button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none text-center bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={showGrievanceInput && !grievanceText.trim()}
              className={`flex-1 sm:flex-none justify-center font-semibold text-xs sm:text-sm py-2.5 px-5 rounded-xl transition-all shadow-lg flex items-center gap-1.5 text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                showGrievanceInput
                  ? "bg-rose-600 hover:bg-rose-500"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{showGrievanceInput ? "Submit Report" : "Confirm & Save"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
