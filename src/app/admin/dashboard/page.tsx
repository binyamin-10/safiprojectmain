"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  LogOut,
  CheckCircle2,
  Clock,
  Search,
  Trash2,
  Eye,
  Check,
  AlertTriangle,
  Loader2,
  User,
  Users,
  Award,
  BookOpen,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  X
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface Subject {
  id: string;
  subjectCode: string;
  subjectName: string;
  grade: string;
  gradePoint: number;
  credits: number;
  creditPoint: number;
  status: string;
}

interface SemesterReport {
  id: string;
  semesterNumber: number;
  sgpa: number;
  cgpa: number;
  overallGrade: string;
  status: string;
  fileName: string | null;
  fileUrl: string | null;
  isVerified: boolean;
  subjects: Subject[];
}

interface Student {
  id: string;
  registerNo: string;
  name: string;
  batch?: string | null;
  createdAt: string;
  semesters: SemesterReport[];
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<string>("All");
  
  // Modal viewer states
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isViewingTranscript, setIsViewingTranscript] = useState(false);

  // Expanded student sections in main list
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user) {
      if ((session.user as any).role !== "ADMIN") {
        router.push("/student/dashboard");
      } else {
        fetchStudents();
      }
    }
  }, [status, session, router]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/students");
      if (!res.ok) throw new Error("Could not load database.");
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      setError("Failed to fetch students dataset.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReport = async (registerNo: string, semesterNumber: number, verify: boolean) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/students/${registerNo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semesterNumber,
          isVerified: verify,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to update verification status.");
      } else {
        // Refresh local student record in list
        fetchStudents();
        // If viewing transcript modal, update the local selected student as well
        if (selectedStudent && selectedStudent.registerNo === registerNo) {
          const updatedSemesters = selectedStudent.semesters.map(sem => {
            if (sem.semesterNumber === semesterNumber) {
              return { ...sem, isVerified: verify };
            }
            return sem;
          });
          setSelectedStudent({ ...selectedStudent, semesters: updatedSemesters });
        }
      }
    } catch (err) {
      setError("Verification server request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (registerNo: string) => {
    if (!confirm(`Are you absolutely sure you want to delete the profile of student ${registerNo}? This action is irreversible.`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/students/${registerNo}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to delete student record.");
      } else {
        setStudents(prev => prev.filter(s => s.registerNo !== registerNo));
        if (selectedStudent && selectedStudent.registerNo === registerNo) {
          setIsViewingTranscript(false);
          setSelectedStudent(null);
        }
      }
    } catch (err) {
      setError("Delete server request failed.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentExpand = (id: string) => {
    setExpandedStudents(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Extract batches dynamically, merging with standard default FYUGP batches
  const defaultBatches = ["2024-2028", "2025-2029", "2026-2030"];
  const uniqueBatches = Array.from(new Set([...defaultBatches, ...students.map(s => s.batch).filter(Boolean)])) as string[];

  // Filter by selected batch for metrics and listing
  const batchStudents = selectedBatch === "All"
    ? students
    : selectedBatch === "Legacy"
      ? students.filter(s => !s.batch)
      : students.filter(s => s.batch === selectedBatch);

  // Compile metrics
  const totalStudents = batchStudents.length;
  let totalPendingSemesters = 0;
  let totalVerifiedSemesters = 0;
  let runningCgpaSum = 0;
  let studentCgpaCount = 0;

  // Track pending queue list
  interface PendingItem {
    studentName: string;
    registerNo: string;
    report: SemesterReport;
  }
  const pendingQueue: PendingItem[] = [];

  batchStudents.forEach((student) => {
    student.semesters.forEach((sem) => {
      if (sem.isVerified) {
        totalVerifiedSemesters++;
      } else {
        totalPendingSemesters++;
        pendingQueue.push({
          studentName: student.name,
          registerNo: student.registerNo,
          report: sem,
        });
      }
    });

    if (student.semesters.length > 0) {
      // Latest semester CGPA represents the student's current CGPA
      const latestSem = student.semesters[student.semesters.length - 1];
      runningCgpaSum += latestSem.cgpa;
      studentCgpaCount++;
    }
  });

  const departmentAverageCgpa = studentCgpaCount > 0 ? parseFloat((runningCgpaSum / studentCgpaCount).toFixed(3)) : 0;

  // Filter students based on search query
  const filteredStudents = batchStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.registerNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pie chart data
  const pieData = [
    { name: "Verified Semesters", value: totalVerifiedSemesters, color: "#10b981" },
    { name: "Pending Audit", value: totalPendingSemesters, color: "#f59e0b" },
  ];

  if (loading && students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
        <p className="mt-4 text-slate-400 font-medium">Accessing Academic Records Database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 text-slate-100">
      
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/40 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-rose-600/20 border border-rose-500/30 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-100 block">Faculty Administration</span>
              <span className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold block leading-none">
                BCA Department Portal
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm px-3.5 py-1.5 rounded-xl transition-all font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm mb-6">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
            <button className="ml-auto text-rose-300 font-bold" onClick={() => setError("")}>
              ✕
            </button>
          </div>
        )}

        {/* Top metrics dashboard banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Audit Queue</span>
              <p className="text-3xl font-black text-amber-400 mt-1">{totalPendingSemesters}</p>
            </div>
          </div>
        </div>

        {/* Two Columns Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Auditing Verification Queue & Charts (width 2/3) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Auditing queue list */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="font-bold text-lg text-slate-200 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-rose-400" />
                Audit Marksheets Queue
              </h3>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 scrollbar-hide">
                {pendingQueue.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-700/80 transition-all"
                  >
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
                            title="This file was stored locally on the server and was permanently deleted during the Vercel Blob cloud migration. Please request the student to re-upload this marksheet."
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
                      <button
                        onClick={() => handleVerifyReport(item.registerNo, item.report.semesterNumber, true)}
                        className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-xl transition-all w-1/2 sm:w-auto font-bold shadow-md"
                      >
                        <Check className="w-4 h-4" />
                        <span>Verify & Approve</span>
                      </button>
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
                      <BarChart data={students.map(s => ({
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
          </div>

          {/* Right Column: Database Students Directory (width 1/3) */}
          <div className="space-y-8">
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-400" />
                Students Directory
              </h3>

              {/* Batch filter */}
              <div className="relative mb-3">
                <Users className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-1.5 pl-9 pr-8 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="All">All FYUGP Batches</option>
                  {uniqueBatches.map(b => (
                    <option key={b} value={b} className="bg-slate-950 text-slate-100">{b}</option>
                  ))}
                  {students.some(s => !s.batch) && (
                    <option value="Legacy" className="bg-slate-950 text-slate-100">Legacy / No Batch</option>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

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
                {filteredStudents.map((student) => {
                  const latestSem = student.semesters[student.semesters.length - 1];
                  const cgpa = latestSem ? latestSem.cgpa : 0;
                  
                  return (
                    <div
                      key={student.id}
                      className="bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 rounded-xl overflow-hidden"
                    >
                      <div className="p-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-slate-200 block truncate">
                            {student.name}
                          </span>
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

                      {/* Summary details */}
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
      </main>

      {/* Admin View Full Student Profile & Verification Transcript Modal */}
      {isViewingTranscript && selectedStudent && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-panel w-full max-w-4xl rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-700/80">
            
            {/* Modal Header */}
            <div className="bg-slate-900/60 p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                  Academic Record Transcript
                </span>
                <h3 className="font-extrabold text-xl text-slate-100 mt-1">{selectedStudent.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Register No: <strong>{selectedStudent.registerNo}</strong> • BCA Program {selectedStudent.batch ? `(FYUGP Batch ${selectedStudent.batch})` : ""}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsViewingTranscript(false);
                  setSelectedStudent(null);
                }}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-hide">
              {selectedStudent.semesters.map((sem) => (
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
                            title="This file was stored locally on the server and was permanently deleted during the Vercel Blob cloud migration. Please request the student to re-upload this marksheet."
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
                            View Marksheet PDF
                          </a>
                        )
                      )}
                      {sem.isVerified ? (
                        <button
                          onClick={() => handleVerifyReport(selectedStudent.registerNo, sem.semesterNumber, false)}
                          className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl text-xs font-bold"
                          title="Revoke validation"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Verified
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerifyReport(selectedStudent.registerNo, sem.semesterNumber, true)}
                          className="flex items-center gap-1 bg-amber-500/10 hover:bg-emerald-600 hover:text-white border border-amber-500/20 hover:border-transparent text-amber-400 px-3 py-1 rounded-xl text-xs font-bold transition-all"
                        >
                          Approve Upload
                        </button>
                      )}
                    </div>
                  </div>

                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-900/20 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-800/80">
                        <th className="p-3 w-28">Subject Code</th>
                        <th className="p-3">Title</th>
                        <th className="p-3 text-center w-20">Credits</th>
                        <th className="p-3 text-center w-20">Grade</th>
                        <th className="p-3 text-center w-24">Credit Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sem.subjects.map((sub) => (
                        <tr key={sub.id} className="border-b border-slate-800/30 last:border-0 hover:bg-slate-900/10">
                          <td className="p-3 font-semibold text-indigo-400">{sub.subjectCode}</td>
                          <td className="p-3 text-slate-300">{sub.subjectName?.split(" - ")[1] || sub.subjectName || "Unknown"}</td>
                          <td className="p-3 text-center">{sub.credits.toFixed(1)}</td>
                          <td className="p-3 text-center font-bold text-slate-100">{sub.grade}</td>
                          <td className="p-3 text-center font-semibold">{sub.creditPoint.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {selectedStudent.semesters.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  This student has not uploaded any marksheet reports yet.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-900/60 p-4 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setIsViewingTranscript(false);
                  setSelectedStudent(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm py-2 px-6 rounded-xl transition-all"
              >
                Close Transcript
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
