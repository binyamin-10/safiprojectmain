"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  LogOut,
  Upload,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle,
  ChevronDown,
  Loader2,
  Trash2,
  FileSpreadsheet,
  Award,
  BookOpen,
  Printer,
  Edit2,
  Save,
  X,
  Briefcase,
  ExternalLink,
  LayoutDashboard
} from "lucide-react";

// Calicut University grade point table (inlined — no curriculum dependency)
const GRADE_POINTS: Record<string, number> = {
  O: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, P: 4, F: 0,
};

interface Subject {
  id?: string;
  code?: string;
  name?: string;
  subjectCode?: string;
  subjectName?: string;
  grade: string;
  gradePoint: number;
  credits: number;
  creditPoint: number;
  status: string;
  ocrConfidence?: "High" | "Medium" | "Low";
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

interface Internship {
  id: string;
  courseName: string;
  hours: number;
  fileName: string | null;
  fileUrl: string | null;
  isVerified: boolean;
  createdAt: string;
}

interface StudentData {
  id: string;
  name: string;
  registerNo: string;
  semesters: SemesterReport[];
  internships: Internship[];
}

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "semesters" | "internships">("dashboard");

  // Upload states
  const [uploadSemester, setUploadSemester] = useState<number>(1);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);

  // Internship states
  const [internshipCourse, setInternshipCourse] = useState("");
  const [internshipHours, setInternshipHours] = useState("");
  const [internshipFile, setInternshipFile] = useState<File | null>(null);
  const [uploadingInternship, setUploadingInternship] = useState(false);

  // OCR modal states
  const [ocrData, setOcrData] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showGrievanceInput, setShowGrievanceInput] = useState(false);
  const [grievanceText, setGrievanceText] = useState("");

  // Expanded semester cards state
  const [expandedSemesters, setExpandedSemesters] = useState<Record<number, boolean>>({});

  // Active view: dashboard / transcript
  const [isPrintView, setIsPrintView] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const internshipFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user) {
      fetchStudentData();
    }
  }, [status, session, router]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const registerNo = (session?.user as any).registerNo;
      const res = await fetch(`/api/students/${registerNo}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to fetch student details.");
      } else {
        setStudent(data.student);
      }
    } catch (err) {
      setError("An error occurred loading academic data.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("Only official PDF files from SAFI College are accepted.");
        setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setUploadFile(file);
      setError("");
    }
  };

  const triggerUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setScanning(true);
    setError("");

    const formData = new FormData();
    formData.append("marksheet", uploadFile);
    formData.append("semester", uploadSemester.toString());
    formData.append("registerNo", student?.registerNo || "");
    formData.append("studentName", student?.name || "");

    try {
      const res = await fetch("/api/upload-marksheet", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to scan marksheet.");
      } else {
        setOcrData(data.ocrData);
        setIsVerifying(true);
      }
    } catch (err) {
      setError("OCR Scanner connection failed.");
    } finally {
      setScanning(false);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleInternshipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("Only official PDF certificate files are accepted.");
        setInternshipFile(null);
        if (internshipFileInputRef.current) internshipFileInputRef.current.value = "";
        return;
      }
      setInternshipFile(file);
      setError("");
    }
  };

  const submitInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internshipCourse || !internshipHours || !internshipFile) {
      setError("Please fill in all internship fields and upload certificate.");
      return;
    }

    setUploadingInternship(true);
    setError("");

    const formData = new FormData();
    formData.append("courseName", internshipCourse);
    formData.append("hours", internshipHours);
    formData.append("certificate", internshipFile);

    try {
      const res = await fetch("/api/internships", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to upload internship certificate.");
      } else {
        setInternshipCourse("");
        setInternshipHours("");
        setInternshipFile(null);
        if (internshipFileInputRef.current) internshipFileInputRef.current.value = "";
        
        fetchStudentData(); // Refresh UI
      }
    } catch (err) {
      setError("Internship upload connection failed.");
    } finally {
      setUploadingInternship(false);
    }
  };

  const handleGradeChange = (index: number, newGrade: string) => {
    if (!ocrData) return;

    const updatedSubjects = [...ocrData.subjects];
    const subject = updatedSubjects[index];
    const gp = GRADE_POINTS[newGrade] ?? 0;
    const cp = gp * subject.credits;

    updatedSubjects[index] = {
      ...subject,
      grade: newGrade,
      gradePoint: gp,
      creditPoint: cp,
      status: newGrade === "F" ? "Fail" : "Pass",
    };

    // Recompute SGPA
    let totalCredits = 0;
    let totalGP = 0;
    let failed = false;

    updatedSubjects.forEach((sub) => {
      totalCredits += sub.credits;
      totalGP += sub.creditPoint;
      if (sub.grade === "F") failed = true;
    });

    const newSgpa = totalCredits > 0 ? parseFloat((totalGP / totalCredits).toFixed(3)) : 0;

    // Overall grade letter mapping
    let overallGrade = "F";
    if (!failed) {
      if (newSgpa >= 9.5) overallGrade = "O";
      else if (newSgpa >= 8.5) overallGrade = "A+";
      else if (newSgpa >= 7.5) overallGrade = "A";
      else if (newSgpa >= 6.5) overallGrade = "B+";
      else if (newSgpa >= 5.5) overallGrade = "B";
      else if (newSgpa >= 4.5) overallGrade = "C";
      else if (newSgpa >= 4.0) overallGrade = "P";
    }

    setOcrData({
      ...ocrData,
      subjects: updatedSubjects,
      sgpa: newSgpa,
      overallGrade,
      status: failed ? "Fail" : "Pass",
    });
  };

  const saveVerifiedSemester = async () => {
    if (!ocrData) return;

    try {
      setLoading(true);
      const res = await fetch("/api/students/save-semester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registerNo: student?.registerNo,
          semester: ocrData.semester.toString(),
          subjects: ocrData.subjects,
          sgpa: ocrData.sgpa,
          overallGrade: ocrData.overallGrade,
          status: ocrData.status,
          fileName: ocrData.fileName,
          fileUrl: ocrData.fileUrl,
          grievance: showGrievanceInput ? grievanceText : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to save verified semester.");
      } else {
        setIsVerifying(false);
        setOcrData(null);
        setShowGrievanceInput(false);
        setGrievanceText("");
        fetchStudentData(); // Refresh UI
      }
    } catch (err) {
      setError("Failed to save verified grades.");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (semNum: number) => {
    setExpandedSemesters((prev) => ({
      ...prev,
      [semNum]: !prev[semNum],
    }));
  };

  if (loading && !student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="mt-4 text-slate-400 font-medium">Loading Student Workspace...</p>
      </div>
    );
  }

  // Calculate Metrics
  const uploadedSemesters = student?.semesters || [];
  const latestSemester = uploadedSemesters[uploadedSemesters.length - 1];
  const overallCgpa = latestSemester ? latestSemester.cgpa : 0;
  
  let totalCreditsCompleted = 0;
  uploadedSemesters.forEach((sem) => {
    sem.subjects.forEach((sub) => {
      if (sub.grade !== "F") {
        totalCreditsCompleted += sub.credits;
      }
    });
  });

  const chartData = uploadedSemesters.map((sem) => ({
    name: `Sem ${sem.semesterNumber}`,
    SGPA: sem.sgpa,
    CGPA: sem.cgpa,
  }));

  // Calicut University Honours requirement is usually 160 credits total.
  const honoursTargetCredits = 160;
  const creditCompletionPercent = Math.min(
    Math.round((totalCreditsCompleted / honoursTargetCredits) * 100),
    100
  );

  return (
    <div className="min-h-screen pb-32 text-slate-100 relative bg-slate-950/20">
      {/* Top Navbar */}
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
              onClick={() => setIsPrintView(!isPrintView)}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm mb-6 print:hidden">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
            <button className="ml-auto text-rose-300 font-bold" onClick={() => setError("")}>
              ✕
            </button>
          </div>
        )}

        {isPrintView ? (
          /* Printable Academic Transcript View */
          <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-10 shadow-2xl relative">
            <div className="absolute top-6 right-6 print:hidden flex gap-2">
              <button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print PDF</span>
              </button>
              <button
                onClick={() => setIsPrintView(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm px-4 py-2 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>

            {/* Official Looking Header */}
            <div className="text-center border-b-2 border-slate-900 pb-6 mb-8 mt-6">
              <h2 className="text-2xl font-extrabold uppercase tracking-wide">
                Safi Institute of Advanced Study
              </h2>
              <p className="text-sm font-semibold text-slate-600 uppercase mt-0.5">
                Affiliated with Calicut University
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Vazhayur East P.O, Malappuram District, Kerala — 673641
              </p>
              <h3 className="text-lg font-bold underline uppercase tracking-widest mt-4">
                Official Academic Transcript Record
              </h3>
            </div>

            {/* Student Metadata Table */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p><strong className="text-slate-500">Student Name:</strong> {student?.name}</p>
                <p><strong className="text-slate-500">Register Number:</strong> {student?.registerNo}</p>
                <p><strong className="text-slate-500">Program:</strong> Bachelor of Computer Applications (BCA Honors)</p>
              </div>
              <div className="text-right">
                <p><strong className="text-slate-500">Academic CGPA:</strong> {overallCgpa.toFixed(3)}</p>
                <p><strong className="text-slate-500">Total Credits Earned:</strong> {totalCreditsCompleted} / {honoursTargetCredits}</p>
                <p><strong className="text-slate-500">Overall Grade Classification:</strong> {latestSemester ? latestSemester.overallGrade : "N/A"}</p>
              </div>
            </div>

            {/* Transcript Table */}
            <div className="space-y-8">
              {uploadedSemesters.map((sem) => (
                <div key={sem.id} className="border border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex justify-between items-center text-sm font-bold">
                    <span>Semester {sem.semesterNumber} Summary</span>
                    <span>SGPA: {sem.sgpa.toFixed(3)} | Status: {sem.status}</span>
                  </div>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-300 text-slate-500 font-bold">
                        <th className="p-3 w-28">Subject Code</th>
                        <th className="p-3">Subject Title</th>
                        <th className="p-3 text-center w-20">Credits</th>
                        <th className="p-3 text-center w-20">Grade</th>
                        <th className="p-3 text-center w-20">Grade Points</th>
                        <th className="p-3 text-center w-24">Credit Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sem.subjects.map((sub) => (
                        <tr key={sub.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-700">{sub.subjectCode}</td>
                          <td className="p-3">{sub.subjectName?.split(" - ")[1] || sub.subjectName || "Unknown"}</td>
                          <td className="p-3 text-center">{sub.credits.toFixed(1)}</td>
                          <td className="p-3 text-center font-bold text-slate-800">{sub.grade}</td>
                          <td className="p-3 text-center">{sub.gradePoint.toFixed(1)}</td>
                          <td className="p-3 text-center font-semibold">{sub.creditPoint.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {uploadedSemesters.length === 0 && (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  No verified academic records are uploaded yet. Add marksheets on the dashboard to build your transcript.
                </div>
              )}
            </div>

            {/* Signature Area */}
            <div className="mt-16 flex justify-between items-end border-t border-slate-300 pt-12">
              <div className="text-xs text-slate-500">
                <p>Date of Issue: {new Date().toLocaleDateString()}</p>
                <p>System Generated Report — Verification Token: {student?.id.substring(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-center text-xs">
                <div className="w-40 border-b border-slate-900 mb-2"></div>
                <p className="font-bold">Head of Department (BCA)</p>
                <p className="text-slate-500">Safi Institute of Advanced Study</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Tabbed Mobile-app Layout */}
            <div className="space-y-6 print:hidden">
            
            {/* 1. Dashboard Tab */}
            {activeTab === "dashboard" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Student Profile Info */}
                <div className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">
                      Academic Profile
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-55 tracking-tight mt-0.5">
                      {student?.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 mt-1.5 text-xs">
                      <span>Register No: <strong>{student?.registerNo}</strong></span>
                      <span className="text-slate-600">•</span>
                      <span>BCA Honours Program</span>
                    </div>
                  </div>
                  
                  {/* Action buttons inside dashboard profile card */}
                  <div className="grid grid-cols-2 gap-2 w-full mt-4 sm:flex sm:w-auto sm:items-center sm:gap-2 sm:mt-0">
                    <button
                      onClick={() => setIsPrintView(true)}
                      className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2.5 sm:py-2 rounded-xl transition-all font-semibold shadow-md shadow-indigo-600/10 w-full sm:w-auto"
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

                {/* Quick stats grid */}
                <div className="grid grid-cols-3 gap-3 sm:gap-6">
                  <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CGPA</span>
                    <span className="text-lg sm:text-2xl font-black text-indigo-400 mt-1">{overallCgpa.toFixed(3)}</span>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Credits</span>
                    <span className="text-lg sm:text-2xl font-black text-emerald-400 mt-1">{totalCreditsCompleted}</span>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Progress</span>
                    <span className="text-lg sm:text-2xl font-black text-rose-400 mt-1">{creditCompletionPercent}%</span>
                  </div>
                </div>

                {/* Honors Tracker Progress */}
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="font-bold text-base text-slate-200 mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-400" />
                    BCA Honors Progress
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Total Completed Credits:</span>
                      <span className="font-bold text-emerald-400">{totalCreditsCompleted} / {honoursTargetCredits}</span>
                    </div>

                    {/* Credit Bar */}
                    <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-800 overflow-hidden">
                      <div
                        className="bg-linear-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${creditCompletionPercent}%` }}
                      ></div>
                    </div>

                    <div className="text-xs text-slate-400 bg-slate-950/40 border border-slate-800/60 p-3 rounded-xl leading-relaxed mt-2">
                      💡 BCA Honors curriculum requires a minimum of 160 credits across 8 semesters with no active failed backlogs to receive honors classification.
                    </div>
                  </div>
                </div>

                {/* Uploaded Marksheets Overview list */}
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="font-bold text-base text-slate-200 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    Semester Status Log
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                      const report = uploadedSemesters.find((r) => r.semesterNumber === num);
                      return (
                        <div
                          key={num}
                          className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-sm"
                        >
                          <div>
                            <span className="font-semibold text-slate-200">Semester {num}</span>
                            {report && (
                              <span className="text-[11px] text-slate-400 block max-w-[140px] truncate">
                                {report.fileName || "Uploaded marksheet"}
                              </span>
                            )}
                          </div>
                          <div>
                            {report ? (
                              <div className="flex items-center gap-1.5">
                                {report.isVerified ? (
                                  <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                                    Pending
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">Not Uploaded</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Semesters Tab */}
            {activeTab === "semesters" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Upload Form */}
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="font-bold text-base text-slate-200 mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-indigo-400" />
                    Submit Semester Marksheet
                  </h3>
                  <form onSubmit={triggerUpload} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Select Semester
                      </label>
                      <select
                        value={uploadSemester}
                        onChange={(e) => setUploadSemester(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer text-sm font-semibold"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                          <option key={num} value={num}>
                            Semester {num}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Upload File (PDF)
                      </label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                          uploadFile
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-50/5"
                        }`}
                      >
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleFileChange}
                          ref={fileInputRef}
                          className="hidden"
                        />
                        
                        {uploadFile ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                              <FileText className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-100">{uploadFile.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB • Ready to Scan</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              className="text-xs text-rose-400 hover:text-rose-300 font-bold underline mt-2"
                            >
                              Remove File
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2.5">
                            <div className="w-12 h-12 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400">
                              <Upload className="w-6 h-6 animate-bounce" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-100">Upload Marksheet</p>
                              <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                                Drag & drop your marksheet PDF here, or <span className="text-indigo-400 font-bold underline">browse files</span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={scanning || !uploadFile}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all disabled:bg-slate-800 disabled:text-slate-400/60 flex items-center justify-center gap-2 mt-2"
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Executing OCR Scan...</span>
                        </>
                      ) : (
                        <>
                          <Award className="w-5 h-5" />
                          <span>Scan & Extract Marks</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Semester record breakdowns */}
                <div className="space-y-4">
                  <h3 className="font-bold text-base text-slate-200">Semester Record Breakdown</h3>
                  {uploadedSemesters.map((sem) => (
                    <div key={sem.id} className="glass-panel rounded-2xl overflow-hidden">
                      <button
                        onClick={() => toggleExpand(sem.semesterNumber)}
                        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-800/20 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${sem.isVerified ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <div>
                            <span className="font-bold text-slate-100 text-sm">Semester {sem.semesterNumber}</span>
                            <div className="flex items-center gap-3.5 text-[11px] text-slate-400 mt-1">
                              <span>SGPA: <strong>{sem.sgpa.toFixed(3)}</strong></span>
                              <span>CGPA: <strong>{sem.cgpa.toFixed(3)}</strong></span>
                              <span>Status: <strong className={sem.status === "Pass" ? "text-emerald-400" : "text-rose-400"}>{sem.status}</strong></span>
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            expandedSemesters[sem.semesterNumber] ? "rotate-180" : ""
                          }`}
                        />
                      </button>

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
                              {sem.subjects.map((sub) => (
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
            )}

            {/* 3. Internships Tab */}
            {activeTab === "internships" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Submit Form */}
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="font-bold text-base text-slate-200 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-400" />
                    Upload Internship Certificate
                  </h3>
                  <form onSubmit={submitInternship} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Course/Internship Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Full Stack Web Development"
                          value={internshipCourse}
                          onChange={(e) => setInternshipCourse(e.target.value)}
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
                          onChange={(e) => setInternshipHours(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Upload Certificate (PDF)
                      </label>
                      <div
                        onClick={() => internshipFileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                          internshipFile
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-50/5"
                        }`}
                      >
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleInternshipFileChange}
                          ref={internshipFileInputRef}
                          className="hidden"
                        />
                        
                        {internshipFile ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                              <FileText className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-100">{internshipFile.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{(internshipFile.size / 1024 / 1024).toFixed(2)} MB • Ready to Upload</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInternshipFile(null);
                                if (internshipFileInputRef.current) internshipFileInputRef.current.value = "";
                              }}
                              className="text-xs text-rose-400 hover:text-rose-300 font-bold underline mt-2"
                            >
                              Remove File
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2.5">
                            <div className="w-12 h-12 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400">
                              <Upload className="w-6 h-6 animate-bounce" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-100">Upload Certificate</p>
                              <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                                Drag & drop your certificate PDF here, or <span className="text-indigo-400 font-bold underline">browse files</span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={uploadingInternship || !internshipCourse || !internshipHours || !internshipFile}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all disabled:bg-slate-800 disabled:text-slate-400/60 flex items-center justify-center gap-2 mt-2"
                    >
                      {uploadingInternship ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Uploading Certificate...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span>Submit Internship Record</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Internship List */}
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="font-bold text-base text-slate-200 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-400" />
                    My Internships
                  </h3>
                  {student?.internships && student.internships.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs min-w-[480px]">
                        <thead>
                          <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-bold border-b border-slate-800 pb-2.5">
                            <th className="p-3">Course/Internship Name</th>
                            <th className="p-3 text-center w-24">Hours</th>
                            <th className="p-3 text-center w-28">Status</th>
                            <th className="p-3 text-center w-32">Certificate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {student.internships.map((internship) => (
                            <tr key={internship.id} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-900/10">
                              <td className="p-3 font-semibold text-slate-200">{internship.courseName}</td>
                              <td className="p-3 text-center text-slate-300 font-medium">{internship.hours} hrs</td>
                              <td className="p-3 text-center">
                                {internship.isVerified ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {internship.fileUrl && (
                                  <a
                                    href={`/api/view-file?url=${encodeURIComponent(internship.fileUrl)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    View PDF
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No internship certificates uploaded yet.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </main>

    {!isPrintView && (
      <div className="fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200/80 rounded-t-3xl py-3.5 pb-5 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-40 print:hidden">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1.5 py-1 px-4 transition-all ${
            activeTab === "dashboard"
              ? "text-indigo-600 scale-105"
              : "text-[#5e7e72] hover:text-slate-800"
          }`}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-bold tracking-wider">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab("semesters")}
          className={`flex flex-col items-center gap-1.5 py-1 px-4 transition-all ${
            activeTab === "semesters"
              ? "text-[#0D7F58] scale-105"
              : "text-[#5e7e72] hover:text-[#0D7F58]"
          }`}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-[10px] font-bold tracking-wider">Semesters</span>
        </button>

        <button
          onClick={() => setActiveTab("internships")}
          className={`flex flex-col items-center gap-1.5 py-1 px-4 transition-all ${
            activeTab === "internships"
              ? "text-[#0D7F58] scale-105"
              : "text-[#5e7e72] hover:text-[#0D7F58]"
          }`}
        >
          <Briefcase className="w-6 h-6" />
          <span className="text-[10px] font-bold tracking-wider">Internships</span>
        </button>
      </div>
    )}

      {/* Human-in-the-loop OCR Verification Modal */}
      {isVerifying && ocrData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="glass-panel w-full max-w-3xl rounded-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-700/80">
            
            {/* Header */}
            <div className="bg-slate-900/60 p-3.5 sm:p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-100">Verify Scan: Semester {ocrData.semester}</h3>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  Confirm extracted details for <strong>{ocrData.studentName}</strong> ({ocrData.registerNo})
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setIsVerifying(false); setOcrData(null); }}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 flex-1 scrollbar-hide">
              <div className="flex items-center gap-2.5 sm:gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-2.5 sm:p-3 rounded-xl text-[10px] sm:text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>
                  <strong>OCR extraction may contain slight spelling errors.</strong> Please verify that each course code and grade matches your original paper. If there is any mismatch, please click the <strong>Report Mistake</strong> button to report it to the faculty.
                </span>
              </div>

              {/* Table / Mobile Cards */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
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
                      {ocrData.subjects.map((sub: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10">
                          <td className="p-3 font-semibold text-indigo-400 text-sm">{sub.code}</td>
                          <td className="p-3 text-xs leading-normal">{sub.name?.split(" - ")[1] || sub.name || "Unknown"}</td>
                          <td className="p-3 text-center text-sm">{sub?.credits?.toFixed(1) || "-"}</td>
                          <td className="p-3 text-center">
                            <span className="font-extrabold text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                              {sub.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Card View */}
                <div className="flex sm:hidden flex-col divide-y divide-slate-800/40">
                  {ocrData.subjects.map((sub: any, idx: number) => (
                    <div key={idx} className="p-3 hover:bg-slate-800/10 flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        <div className="font-semibold text-indigo-400 text-xs">{sub.code}</div>
                        <div className="font-extrabold text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                          Grade: {sub.grade}
                        </div>
                      </div>
                      <div className="text-[11px] leading-snug text-slate-200">
                        {sub.name?.split(" - ")[1] || sub.name || "Unknown"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Credits: {sub?.credits?.toFixed(1) || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SGPA Summary */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-slate-950/40 p-3.5 sm:p-4 border border-slate-800 rounded-xl">
                <div>
                  <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold">Calculated SGPA</span>
                  <p className="text-xl sm:text-2xl font-black text-indigo-400 mt-1">{ocrData.sgpa.toFixed(3)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold">Overall Classification</span>
                  <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{ocrData.overallGrade}</p>
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
                    onChange={(e) => setGrievanceText(e.target.value)}
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
                  onClick={() => {
                    setShowGrievanceInput(!showGrievanceInput);
                    if (showGrievanceInput) setGrievanceText("");
                  }}
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
                  onClick={() => {
                    setIsVerifying(false);
                    setOcrData(null);
                    setShowGrievanceInput(false);
                    setGrievanceText("");
                  }}
                  className="flex-1 sm:flex-none text-center bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveVerifiedSemester}
                  disabled={showGrievanceInput && !grievanceText.trim()}
                  className={`flex-1 sm:flex-none justify-center font-semibold text-xs sm:text-sm py-2.5 px-5 rounded-xl transition-all shadow-lg flex items-center gap-1.5 text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                    showGrievanceInput
                      ? "bg-rose-600 hover:bg-rose-500"
                      : "bg-[#0D7F58] hover:bg-[#0b6c4b]"
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{showGrievanceInput ? "Submit Report" : "Confirm & Save"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
