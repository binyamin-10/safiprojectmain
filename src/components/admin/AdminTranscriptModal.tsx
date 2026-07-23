"use client";

import { X, ExternalLink, AlertTriangle, Check, Briefcase } from "lucide-react";
import type { Student } from "@/types/admin";

interface AdminTranscriptModalProps {
  student: Student;
  onClose: () => void;
  onVerifyReport: (registerNo: string, semesterNumber: number, isVerified: boolean) => Promise<void>;
  onVerifyInternship: (internshipId: string, isVerified: boolean) => Promise<void>;
}

export default function AdminTranscriptModal({
  student, onClose, onVerifyReport, onVerifyInternship
}: AdminTranscriptModalProps) {
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="glass-panel w-full max-w-4xl rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-700/80">
        
        {/* Modal Header */}
        <div className="bg-slate-900/60 p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
              Academic Record Transcript
            </span>
            <h3 className="font-extrabold text-xl text-slate-100 mt-1">{student.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Register No: <strong>{student.registerNo}</strong> • BCA Program {student.batch ? `(FYUGP Batch ${student.batch})` : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-hide">
          {student.semesters.map((sem) => (
            <div key={sem.id} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
              <div className="bg-slate-900/40 p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <span className="font-bold text-slate-200 text-sm">Semester {sem.semesterNumber} Report</span>
                  <div className="flex gap-4 text-xs text-slate-400 mt-1">
                    <span>SGPA: <strong>{sem.sgpa.toFixed(3)}</strong></span>
                    <span>CGPA: <strong>{sem.cgpa.toFixed(3)}</strong></span>
                    <span>Status: <strong>{sem.status}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {sem.fileUrl && (
                    sem.fileUrl.startsWith('/uploads/') ? (
                      <span
                        className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1 rounded-xl text-xs font-semibold cursor-not-allowed"
                        title="Missing (Legacy)"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        File Missing (Legacy)
                      </span>
                    ) : (
                      <a
                        href={`/api/view-file?url=${encodeURIComponent(sem.fileUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-xl text-xs font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Marks PDF
                      </a>
                    )
                  )}

                  {sem.isVerified ? (
                    <button
                      onClick={() => onVerifyReport(student.registerNo, sem.semesterNumber, false)}
                      className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 text-emerald-400 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
                      title="Revoke Verification status"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approved & Verified</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onVerifyReport(student.registerNo, sem.semesterNumber, true)}
                      className="flex items-center gap-1 bg-amber-500/10 hover:bg-emerald-600 hover:text-white border border-amber-500/20 hover:border-transparent text-amber-400 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <span>Approve Marksheet</span>
                    </button>
                  )}
                </div>
              </div>

              {sem.grievance && (
                <div className="mx-4 mt-3 mb-1 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-rose-300">Student Grievance / Mistake Report:</span>
                    <p className="italic font-medium">"{sem.grievance}"</p>
                  </div>
                </div>
              )}

              {/* Subject details table inside modal */}
              <div className="p-4 bg-slate-900/10">
                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/30">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-900/40 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-800/80">
                        <th className="p-2.5 text-center w-12">#</th>
                        <th className="p-2.5 w-32">Course Code</th>
                        <th className="p-2.5">Course Title</th>
                        <th className="p-2.5 text-center w-20">Credits</th>
                        <th className="p-2.5 text-center w-20">Grade</th>
                        <th className="p-2.5 text-center w-20">GP</th>
                        <th className="p-2.5 text-center w-20">CP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sem.subjects.map((sub, sIdx) => (
                        <tr key={sub.id} className="border-b border-slate-800/20 last:border-0 hover:bg-slate-900/5">
                          <td className="p-2.5 text-center text-slate-500 font-semibold">{sIdx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-200">{sub.subjectCode}</td>
                          <td className="p-2.5 text-slate-300 font-medium">{sub.subjectName}</td>
                          <td className="p-2.5 text-center text-slate-400">{sub.credits.toFixed(1)}</td>
                          <td className="p-2.5 text-center font-bold text-slate-200">{sub.grade}</td>
                          <td className="p-2.5 text-center text-slate-400">{sub.gradePoint.toFixed(2)}</td>
                          <td className="p-2.5 text-center font-semibold text-slate-300">{sub.creditPoint.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}

          {student.semesters.length === 0 && (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No academic semesters records uploaded by this student profile yet.
            </div>
          )}

          {/* Internship details section inside modal */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20 p-5 mt-6">
            <h4 className="font-extrabold text-sm text-slate-200 mb-4 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-rose-400" />
              Uploaded Internship Certificates
            </h4>
            {student.internships && student.internships.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-900/40 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-800/80">
                      <th className="p-3">Course / Internship Name</th>
                      <th className="p-3 text-center w-24">Hours</th>
                      <th className="p-3 text-center w-28">Status</th>
                      <th className="p-3 text-center w-48">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.internships.map(internship => (
                      <tr key={internship.id} className="border-b border-slate-800/30 last:border-0 hover:bg-slate-900/10">
                        <td className="p-3 font-semibold text-slate-200">{internship.courseName}</td>
                        <td className="p-3 text-center font-bold text-indigo-400">{internship.hours} hrs</td>
                        <td className="p-3 text-center">
                          {internship.isVerified ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                              <Check className="w-3.5 h-3.5" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                              Pending Review
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {internship.fileUrl && (
                              <a
                                href={`/api/view-file?url=${encodeURIComponent(internship.fileUrl)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                PDF
                              </a>
                            )}
                            {internship.isVerified ? (
                              <button
                                onClick={() => onVerifyInternship(internship.id, false)}
                                className="inline-flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 hover:border-transparent text-rose-400 hover:text-white px-2.5 py-1.5 rounded-lg font-semibold transition-all"
                              >
                                <X className="w-3 h-3" />
                                Reject
                              </button>
                            ) : (
                              <button
                                onClick={() => onVerifyInternship(internship.id, true)}
                                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white border border-transparent px-2.5 py-1.5 rounded-lg font-semibold transition-all"
                              >
                                <Check className="w-3 h-3" />
                                Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
                No internship certificates uploaded by this student profile yet.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
