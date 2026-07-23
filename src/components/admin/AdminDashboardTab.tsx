"use client";

import { Users, Award, Clock, Briefcase, ExternalLink, X, Check, CheckCircle2, Search, Eye, Trash2, HardDrive, Loader2, AlertTriangle, BookOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { Student } from "@/types/admin";

interface AdminDashboardTabProps {
  students: Student[];
  filteredStudents: Student[];
  totalStudents: number;
  departmentAverageCgpa: number;
  totalPendingSemesters: number;
  totalVerifiedSemesters: number;
  totalPendingInternships: number;
  pendingQueue: { registerNo: string; studentName: string; report: any }[];
  pendingInternshipsQueue: { registerNo: string; studentName: string; internship: any }[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleVerifyReport: (registerNo: string, semesterNumber: number, isVerified: boolean) => Promise<void>;
  handleVerifyInternship: (internshipId: string, isVerified: boolean) => Promise<void>;
  handleDeleteStudent: (registerNo: string) => Promise<void>;
  setSelectedStudent: (student: Student) => void;
  setIsViewingTranscript: (view: boolean) => void;
  blobAudit: any;
  isBlobAuditing: boolean;
  isBlobCleaning: boolean;
  handleBlobAudit: () => Promise<void>;
  handleBlobCleanup: () => Promise<void>;
}

export default function AdminDashboardTab({
  students, filteredStudents, totalStudents, departmentAverageCgpa,
  totalPendingSemesters, totalVerifiedSemesters, totalPendingInternships,
  pendingQueue, pendingInternshipsQueue, searchQuery, setSearchQuery,
  handleVerifyReport, handleVerifyInternship, handleDeleteStudent,
  setSelectedStudent, setIsViewingTranscript,
  blobAudit, isBlobAuditing, isBlobCleaning, handleBlobAudit, handleBlobCleanup
}: AdminDashboardTabProps) {

  // For pie chart
  const pieData = [
    { name: "Verified", value: totalVerifiedSemesters, color: "#10b981" },
    { name: "Pending", value: totalPendingSemesters, color: "#f59e0b" },
  ];

  return (
    <>
      {/* Top metrics dashboard banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass-panel rounded-2xl p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Enrolled</span>
            <p className="text-3xl font-black text-slate-100 mt-1">{totalStudents}</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Department GPA</span>
            <p className="text-3xl font-black text-emerald-400 mt-1">{departmentAverageCgpa.toFixed(3)}</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Semesters</span>
            <p className="text-3xl font-black text-amber-400 mt-1">{totalPendingSemesters}</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Internships</span>
            <p className="text-3xl font-black text-rose-400 mt-1">{totalPendingInternships}</p>
          </div>
        </div>
      </div>

      {/* Two Columns Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3 width): Auditing Queues & Chart */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Auditing queue list */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-lg text-slate-200 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-rose-400" />
              Audit Marksheets Queue
            </h3>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
              {pendingQueue.slice(0, 50).map((item, idx) => (
                <div key={idx} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-700/80 transition-all">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{item.studentName}</span>
                      <span className="text-xs text-slate-400">({item.registerNo})</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex gap-3">
                      <span>Semester: <strong>{item.report.semesterNumber}</strong></span>
                      <span>SGPA: <strong className="text-indigo-400">{item.report.sgpa.toFixed(3)}</strong></span>
                      {item.report.fileName && (
                        <span className="max-w-[150px] truncate block">File: {item.report.fileName}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    {item.report.fileUrl && (
                      item.report.fileUrl.startsWith('/uploads/') ? (
                        <span
                          className="flex items-center justify-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3 py-1.5 rounded-xl cursor-not-allowed font-medium w-1/2 sm:w-auto"
                          title="Missing (Legacy)"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Missing (Legacy)</span>
                        </span>
                      ) : (
                        <a
                          href={`/api/view-file?url=${encodeURIComponent(item.report.fileUrl)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-xl transition-all w-1/2 sm:w-auto font-medium"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View PDF</span>
                        </a>
                      )
                    )}
                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      <button
                        onClick={() => handleVerifyReport(item.registerNo, item.report.semesterNumber, false)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs px-3 py-1.5 rounded-xl transition-all font-bold shadow-md"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleVerifyReport(item.registerNo, item.report.semesterNumber, true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-xl transition-all font-bold shadow-md"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {pendingQueue.length === 0 && (
                <div className="text-center py-12 text-slate-400 border border-dashed border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-sm">All Clear! Audit queue is empty.</p>
                  <p className="text-xs text-slate-500 mt-0.5">There are no pending student marksheets needing validation.</p>
                </div>
              )}
            </div>
          </div>

          {/* Visual statistics chart */}
          {totalStudents > 0 && (
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="font-bold text-lg text-slate-200 mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-rose-400" />
                Class Distribution metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Distribution graph */}
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={students.slice(0, 50).map(s => ({
                      name: s.name.split(" ")[0],
                      CGPA: s.semesters.length > 0 ? s.semesters[s.semesters.length - 1].cgpa : 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D2E6DF" />
                      <XAxis dataKey="name" stroke="#2E6C56" fontSize={10} />
                      <YAxis domain={[0, 10]} stroke="#2E6C56" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #D2E6DF", borderRadius: "12px" }}
                        labelStyle={{ color: "#0f172a" }}
                        itemStyle={{ color: "#0D7F58" }}
                      />
                      <Bar dataKey="CGPA" fill="#0D7F58" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Verification Pie */}
                <div className="h-56 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData.filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center leading-none">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Verified</span>
                    <span className="text-xl font-black text-emerald-400 mt-1">
                      {totalVerifiedSemesters}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit Internships Queue */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-lg text-slate-200 mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-rose-400" />
              Audit Internships Queue
            </h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 scrollbar-hide">
              {pendingInternshipsQueue.map((item, idx) => (
                <div key={idx} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-700/80 transition-all">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{item.studentName}</span>
                      <span className="text-xs text-slate-400">({item.registerNo})</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex gap-3 flex-wrap">
                      <span>Course: <strong>{item.internship.courseName}</strong></span>
                      <span>Hours: <strong className="text-indigo-400">{item.internship.hours} hrs</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    {item.internship.fileUrl && (
                      <a
                        href={`/api/view-file?url=${encodeURIComponent(item.internship.fileUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-xl transition-all w-1/2 sm:w-auto font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Certificate</span>
                      </a>
                    )}
                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      <button
                        onClick={() => handleVerifyInternship(item.internship.id, false)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs px-3 py-1.5 rounded-xl transition-all font-bold shadow-md"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleVerifyInternship(item.internship.id, true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-xl transition-all font-bold shadow-md"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {pendingInternshipsQueue.length === 0 && (
                <div className="text-center py-12 text-slate-400 border border-dashed border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-sm">All Clear! Internship queue is empty.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width): Students Directory */}
        <div className="space-y-8">
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-400" />
              Students Directory
            </h3>

            {/* Search input */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search register no or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-1.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            {/* Directory list */}
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-hide">
              {filteredStudents.slice(0, 100).map((student) => {
                const latestSem = student.semesters[student.semesters.length - 1];
                const cgpa = latestSem ? latestSem.cgpa : 0;

                return (
                  <div key={student.id} className="bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 rounded-xl overflow-hidden">
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-slate-200 block truncate">{student.name}</span>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-slate-500">{student.registerNo}</span>
                          {student.batch && (
                            <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-md font-semibold leading-none">
                              {student.batch}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsViewingTranscript(true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-lg transition-all"
                          title="View Transcript"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.registerNo)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-600 border border-transparent text-slate-400 hover:text-white rounded-lg transition-all"
                          title="Delete Student Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="px-3.5 pb-3 border-t border-slate-800/40 bg-slate-950/20 flex justify-between text-[10px] text-slate-400 pt-2 font-semibold">
                      <span>Uploads: {student.semesters.length} semesters</span>
                      <span>CGPA: <strong className="text-emerald-400">{cgpa.toFixed(3)}</strong></span>
                    </div>
                  </div>
                );
              })}
              {filteredStudents.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-6">No matching student profiles found.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Storage panel removed to prevent accidental manual blob deletion */}
    </>
  );
}
