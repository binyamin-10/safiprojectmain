"use client";

import { Upload, Briefcase, Loader2, CheckCircle2, Clock, ExternalLink, XCircle } from "lucide-react";
import PdfDropZone from "@/components/ui/PdfDropZone";
import type { Internship } from "@/types/student";

interface StudentInternshipsTabProps {
  internships: Internship[];
  internshipCourse: string;
  internshipHours: string;
  internshipFile: File | null;
  uploadingInternship: boolean;
  onCourseChange: (v: string) => void;
  onHoursChange: (v: string) => void;
  onFileSelect: (f: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function StudentInternshipsTab({
  internships, internshipCourse, internshipHours, internshipFile,
  uploadingInternship, onCourseChange, onHoursChange, onFileSelect, onSubmit,
}: StudentInternshipsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Upload Form */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="font-bold text-base text-slate-200 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-indigo-400" />
          Upload Internship Certificate
        </h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Course / Internship Name
              </label>
              <input
                type="text"
                placeholder="e.g. Full Stack Web Development"
                value={internshipCourse}
                onChange={e => onCourseChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Duration (Hours)
              </label>
              <input
                type="number"
                placeholder="e.g. 40"
                value={internshipHours}
                onChange={e => onHoursChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
              />
            </div>
          </div>

          <PdfDropZone
            file={internshipFile}
            onFileSelect={onFileSelect}
            label="Upload Certificate"
            subLabel="Drag & drop your certificate PDF here, or browse files"
          />

          <button
            type="submit"
            disabled={uploadingInternship || !internshipCourse || !internshipHours || !internshipFile}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all disabled:bg-slate-800 disabled:text-slate-400/60 flex items-center justify-center gap-2 mt-2"
          >
            {uploadingInternship ? (
              <><Loader2 className="w-5 h-5 animate-spin" /><span>Uploading Certificate...</span></>
            ) : (
              <><Upload className="w-5 h-5" /><span>Submit Internship Record</span></>
            )}
          </button>
        </form>
      </div>

      {/* Submitted Records */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="font-bold text-base text-slate-200 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-indigo-400" />
          Submitted Internship Records
        </h3>
        {internships.length > 0 ? (
          <div className="space-y-3">
            {internships.map(internship => (
              <div key={internship.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-200">{internship.courseName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{internship.hours} hours • {new Date(internship.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {internship.fileUrl && (
                    <a
                      href={`/api/view-file?url=${encodeURIComponent(internship.fileUrl)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  )}
                  {internship.isVerified ? (
                    <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : internship.isRejected ? (
                    <span className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                      <XCircle className="w-3 h-3" /> Rejected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                      <Clock className="w-3 h-3 animate-pulse" /> Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
            No internship records submitted yet.
          </div>
        )}
      </div>
    </div>
  );
}
