"use client";

import { Upload, Award, Loader2, ChevronDown, ExternalLink, AlertTriangle } from "lucide-react";
import PdfDropZone from "@/components/ui/PdfDropZone";
import type { SemesterReport } from "@/types/student";

interface SemestersTabProps {
  uploadedSemesters: SemesterReport[];
  uploadSemester: number;
  uploadFile: File | null;
  scanning: boolean;
  expandedSemesters: Record<number, boolean>;
  onSemesterChange: (n: number) => void;
  onFileSelect: (f: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleExpand: (semNum: number) => void;
}

export default function SemestersTab({
  uploadedSemesters, uploadSemester, uploadFile, scanning,
  expandedSemesters, onSemesterChange, onFileSelect, onSubmit, onToggleExpand,
}: SemestersTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Upload Form */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="font-bold text-base text-slate-200 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-400" />
          Submit Semester Marksheet
        </h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Semester
            </label>
            <select
              value={uploadSemester}
              onChange={e => onSemesterChange(parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer text-sm font-semibold"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(num => {
                const isUploaded = uploadedSemesters.some(s => s.semesterNumber === num);
                return (
                  <option key={num} value={num}>
                    Semester {num} {isUploaded ? "(Re-upload / Overwrite)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <PdfDropZone
            file={uploadFile}
            onFileSelect={onFileSelect}
            label="Upload Marksheet"
            subLabel="Drag & drop your marksheet PDF here, or browse files"
          />

          <button
            type="submit"
            disabled={scanning || !uploadFile}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all disabled:bg-slate-800 disabled:text-slate-400/60 flex items-center justify-center gap-2 mt-2"
          >
            {scanning ? (
              <><Loader2 className="w-5 h-5 animate-spin" /><span>Executing OCR Scan...</span></>
            ) : (
              <><Award className="w-5 h-5" /><span>Scan & Extract Marks</span></>
            )}
          </button>
        </form>
      </div>

      {/* Semester Breakdowns */}
      <div className="space-y-4">
        <h3 className="font-bold text-base text-slate-200">Semester Record Breakdown</h3>
        {uploadedSemesters.map(sem => (
          <div key={sem.id} className="glass-panel rounded-2xl overflow-hidden">
            <button
              onClick={() => onToggleExpand(sem.semesterNumber)}
              className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-800/20 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${sem.isRejected ? "bg-rose-500" : sem.isVerified ? "bg-emerald-500" : "bg-amber-500"}`} />
                <div>
                  <span className="font-bold text-slate-100 text-sm">Semester {sem.semesterNumber}</span>
                  <div className="flex items-center gap-3.5 text-[11px] text-slate-400 mt-1">
                    <span>SGPA: <strong>{sem.sgpa.toFixed(3)}</strong></span>
                    <span>CGPA: <strong>{sem.cgpa.toFixed(3)}</strong></span>
                    <span>Status: <strong className={sem.status === "Pass" ? "text-emerald-400" : "text-rose-400"}>{sem.status}</strong></span>
                    {sem.fileUrl && (
                      <span
                        onClick={e => { e.stopPropagation(); window.open(`/api/view-file?url=${encodeURIComponent(sem.fileUrl!)}`, '_blank'); }}
                        className="inline-flex items-center gap-0.5 text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View PDF
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSemesters[sem.semesterNumber] ? "rotate-180" : ""}`} />
            </button>

            {sem.isRejected && (
              <div className="mx-4 mb-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>This marksheet was <strong>rejected</strong> by the department admin. The PDF file was automatically deleted from cloud storage. Please select <strong>Semester {sem.semesterNumber}</strong> above and re-upload a clear marksheet PDF.</span>
              </div>
            )}

            {expandedSemesters[sem.semesterNumber] && (
              <div className="border-t border-slate-800 bg-slate-950/20 p-4 sm:p-5 overflow-x-auto scrollbar-hide">
                <table className="w-full text-left text-xs min-w-[480px]">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-bold border-b border-slate-800 pb-2">
                      <th className="pb-2 w-24">Code</th>
                      <th className="pb-2">Subject Name</th>
                      <th className="pb-2 text-center w-16">Credits</th>
                      <th className="pb-2 text-center w-16">Grade</th>
                      <th className="pb-2 text-center w-16">Grade Pt</th>
                      <th className="pb-2 text-center w-20">Credit Pt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sem.subjects.map(sub => (
                      <tr key={sub.id} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-900/10">
                        <td className="py-2.5 font-semibold text-indigo-400">{sub.subjectCode || sub.code}</td>
                        <td className="py-2.5 text-slate-200">{sub.subjectName?.split(" - ")[1] || sub.subjectName || sub.name || "Unknown"}</td>
                        <td className="py-2.5 text-center text-slate-300">{sub.credits.toFixed(1)}</td>
                        <td className="py-2.5 text-center font-bold text-slate-100">{sub.grade}</td>
                        <td className="py-2.5 text-center text-slate-300">{sub.gradePoint.toFixed(1)}</td>
                        <td className="py-2.5 text-center font-semibold text-slate-100">{sub.creditPoint.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {uploadedSemesters.length === 0 && (
          <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-800 rounded-2xl glass-panel">
            <Upload className="w-8 h-8 mx-auto text-slate-500 mb-2" />
            <p className="font-semibold text-sm">No Marksheets Uploaded</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              Select a semester above and upload your university marksheet to parse your grades.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
