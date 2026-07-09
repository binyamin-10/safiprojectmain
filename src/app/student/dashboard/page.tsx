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
  ExternalLink
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
      setUploadFile(e.target.files[0]);
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
      setInternshipFile(e.target.files[0]);
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
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to save verified semester.");
      } else {
        setIsVerifying(false);
        setOcrData(null);
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
    <div className="min-h-screen pb-12 text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/40 backdrop-blur-md sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-100 block">Student Dashboard</span>
              <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-semibold block leading-none">
                BCA Honours Workspace
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
                  <span>View Dashboard</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Generate Transcript</span>
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
          /* Normal Dashboard Layout */
          <div className="space-y-8 print:hidden">
            
            {/* Student metadata header */}
            <div className="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">
                  Academic Profile
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight mt-1">
                  {student?.name}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 mt-2 text-sm">
                  <span>Register No: <strong>{student?.registerNo}</strong></span>
                  <span className="hidden sm:inline text-slate-600">•</span>
                  <span>BCA Honours Program</span>
                </div>
              </div>

              {/* Quick stats grid */}
              <div className="grid grid-cols-3 gap-6 shrink-0 w-full md:w-auto">
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">CGPA</span>
                  <span className="text-xl sm:text-2xl font-black text-indigo-400 mt-1">{overallCgpa.toFixed(3)}</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Credits</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{totalCreditsCompleted}</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Progress</span>
                  <span className="text-xl sm:text-2xl font-black text-rose-400 mt-1">{creditCompletionPercent}%</span>
                </div>
              </div>
            </div>

            {/* Dashboard grid columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left col: Upload marksheet & visual progress charts */}
              <div className="lg:col-span-2 space-y-8">
                

                {/* Upload Section */}
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-indigo-400" />
                    Submit Semester Marksheet
                  </h3>
                  <form onSubmit={triggerUpload} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Select Semester
                        </label>
                        <select
                          value={uploadSemester}
                          onChange={(e) => setUploadSemester(parseInt(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
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
                          Upload File (Image/PDF)
                        </label>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          ref={fileInputRef}
                          className="w-full text-sm text-slate-400 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 file:cursor-pointer bg-slate-900 border border-slate-700/80 py-1.5 px-3 rounded-xl"
                        />
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
                          <span>Executing Tesseract OCR Scan...</span>
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

                {/* Internship Upload Section */}
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2">
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
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
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
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Upload Certificate (PDF/Image)
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleInternshipFileChange}
                        ref={internshipFileInputRef}
                        className="w-full text-sm text-slate-400 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 file:cursor-pointer bg-slate-900 border border-slate-700/80 py-1.5 px-3 rounded-xl"
                      />
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

                {/* Internship List Section */}
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-400" />
                    My Internships
                  </h3>
                  {student?.internships && student.internships.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-sm min-w-[500px]">
                        <thead>
                          <tr className="text-xs text-slate-500 uppercase tracking-wider font-bold border-b border-slate-800 pb-3">
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
                                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-xs font-semibold">
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
                                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
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

                {/* Expanded Semester Details List */}
                <div className="space-y-4">
                  <h3 className="font-bold text-xl text-slate-200">Semester Record Breakdown</h3>
                  {uploadedSemesters.map((sem) => (
                    <div key={sem.id} className="glass-panel rounded-2xl overflow-hidden">
                      <button
                        onClick={() => toggleExpand(sem.semesterNumber)}
                        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-800/20 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${sem.isVerified ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <div>
                            <span className="font-bold text-slate-100">Semester {sem.semesterNumber}</span>
                            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                              <span>SGPA: <strong>{sem.sgpa.toFixed(3)}</strong></span>
                              <span>CGPA: <strong>{sem.cgpa.toFixed(3)}</strong></span>
                              <span>Status: <strong className={sem.status === "Pass" ? "text-emerald-400" : "text-rose-400"}>{sem.status}</strong></span>
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform ${
                            expandedSemesters[sem.semesterNumber] ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {expandedSemesters[sem.semesterNumber] && (
                        <div className="border-t border-slate-800 bg-slate-950/20 p-4 sm:p-5 overflow-x-auto scrollbar-hide">
                          <table className="w-full text-left text-sm min-w-[500px]">
                            <thead>
                              <tr className="text-xs text-slate-500 uppercase tracking-wider font-bold border-b border-slate-800 pb-3">
                                <th className="pb-3 w-28">Code</th>
                                <th className="pb-3">Subject Name</th>
                                <th className="pb-3 text-center w-20">Credits</th>
                                <th className="pb-3 text-center w-20">Grade</th>
                                <th className="pb-3 text-center w-20">Grade Point</th>
                                <th className="pb-3 text-center w-24">Credit Point</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sem.subjects.map((sub) => (
                                <tr key={sub.id} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-900/10">
                                  <td className="py-3 font-semibold text-indigo-400">{sub.subjectCode}</td>
                                  <td className="py-3 text-slate-200">{sub.subjectName?.split(" - ")[1] || sub.subjectName || "Unknown"}</td>
                                  <td className="py-3 text-center text-slate-300">{sub.credits.toFixed(1)}</td>
                                  <td className="py-3 text-center font-bold text-slate-100">{sub.grade}</td>
                                  <td className="py-3 text-center text-slate-300">{sub.gradePoint.toFixed(1)}</td>
                                  <td className="py-3 text-center font-semibold text-slate-100">{sub.creditPoint.toFixed(1)}</td>
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
                      <p className="font-semibold">No Marksheets Uploaded</p>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                        Select a semester above and upload your university marksheet to parse your grades.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right col: Honors tracker & summary credit bars */}
              <div className="space-y-8">
                
                {/* Honors Progress Card */}
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2">
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

                {/* Uploaded files audit log */}
                <div className="glass-panel rounded-2xl p-6">
                  <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    Uploaded Marksheets
                  </h3>
                  <div className="space-y-3">
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
                              <span className="text-xs text-slate-400 block max-w-[140px] truncate">
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
            </div>



          </div>
        )}
      </main>

      {/* Human-in-the-loop OCR Verification Modal */}
      {isVerifying && ocrData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-panel w-full max-w-3xl rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-700/80">
            
            {/* Header */}
            <div className="bg-slate-900/60 p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-100">Verify Scan: Semester {ocrData.semester}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm extracted details for <strong>{ocrData.studentName}</strong> ({ocrData.registerNo})
                </p>
              </div>
              <button
                onClick={() => { setIsVerifying(false); setOcrData(null); }}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-hide">
              <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-xl text-xs leading-relaxed">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>
                  <strong>OCR extraction may contain slight spelling errors.</strong> Please verify that each course code and grade matches your original paper. Select a grade to correct mismatches.
                </span>
              </div>

              {/* Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
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
                        <td className="p-3 font-semibold text-indigo-400">{sub.code}</td>
                        <td className="p-3 text-xs">{sub.name?.split(" - ")[1] || sub.name || "Unknown"}</td>
                        <td className="p-3 text-center">{sub?.credits?.toFixed(1) || "-"}</td>
                        <td className="p-3 text-center">
                          <select
                            value={sub.grade}
                            onChange={(e) => handleGradeChange(idx, e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold py-1 px-2 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                          >
                            {Object.keys(GRADE_POINTS).map((gradeVal) => (
                              <option key={gradeVal} value={gradeVal}>
                                {gradeVal}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SGPA Summary */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 border border-slate-800 rounded-xl">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Calculated SGPA</span>
                  <p className="text-2xl font-black text-indigo-400 mt-1">{ocrData.sgpa.toFixed(3)}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Overall Classification</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{ocrData.overallGrade}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-900/60 p-4 border-t border-slate-800 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => { setIsVerifying(false); setOcrData(null); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm py-2 px-4 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveVerifiedSemester}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-2 px-5 rounded-xl transition-all shadow-lg flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Confirm & Save</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
