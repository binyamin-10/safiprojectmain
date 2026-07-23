"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
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
  Table2,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  X,
  Briefcase,
  LayoutDashboard,
  MessageSquare,
  Edit2,
  HardDrive,
  Download,
  ArrowUp,
  ArrowDown,
  Calendar
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
import ScorecardBuilder from "@/components/ScorecardBuilder";

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
  isRejected?: boolean;
  apc?: string | null;
  grievance?: string | null;
  subjects: Subject[];
}

interface Internship {
  id: string;
  courseName: string;
  hours: number;
  fileName: string | null;
  fileUrl: string | null;
  isVerified: boolean;
  isRejected?: boolean;
  createdAt: string;
  userId: string;
  user?: {
    name: string;
    registerNo: string;
    batch?: string | null;
  };
}

interface Student {
  id: string;
  registerNo: string;
  name: string;
  batch?: string | null;
  dob?: string | null;
  createdAt: string;
  semesters: SemesterReport[];
  internships: Internship[];
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<string>("All");
  const [selectedAnalysisSemester, setSelectedAnalysisSemester] = useState<number | 'ALL'>(0);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'result-analysis' | 'internships' | 'student-issues' | 'score-cards'>('dashboard');

  const [sortColumn, setSortColumn] = useState<string>("regNo");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (col: string) => {
    if (sortColumn !== col) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 inline ml-1 text-emerald-400" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1 text-emerald-400" />
    );
  };

  // Mock issues state
  const [issues, setIssues] = useState([
    {
      id: "1",
      registerNo: "BCA24015",
      studentName: "Amir Khan",
      subject: "OCR Scanned SGPA Mismatch",
      description: "My semester 2 marksheet was scanned. The OCR read 'A+' as 'A' for the database course, making the SGPA 8.4 instead of 8.8. Please review the PDF.",
      status: "PENDING",
      createdAt: "2026-07-10T10:15:30Z"
    },
    {
      id: "2",
      registerNo: "BCA25102",
      studentName: "Sneha P.",
      subject: "File upload limit exceeded",
      description: "Getting server errors when trying to upload Semester 4 marksheet. PDF size is 4.8MB.",
      status: "PENDING",
      createdAt: "2026-07-09T14:22:10Z"
    },
    {
      id: "3",
      registerNo: "BCA24089",
      studentName: "Rahul R.",
      subject: "Internship Hours Approval request",
      description: "Uploaded TCS internship certificate for 120 hours, but it shows pending for 5 days. Need verification for scholarship.",
      status: "RESOLVED",
      createdAt: "2026-07-08T09:40:00Z"
    }
  ]);

  const handleResolveIssue = (id: string) => {
    setIssues(prev => prev.map(issue => {
      if (issue.id === id) {
        return { ...issue, status: issue.status === "RESOLVED" ? "PENDING" : "RESOLVED" };
      }
      return issue;
    }));
  };

  // Modal viewer states
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isViewingTranscript, setIsViewingTranscript] = useState(false);

  // Student Edit Profile Modal state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editRegisterNo, setEditRegisterNo] = useState("");
  const [editName, setEditName] = useState("");
  const [editBatch, setEditBatch] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [savingStudentEdit, setSavingStudentEdit] = useState(false);

  // States for bulk editing APC / Subject Grades
  const [isEditingApc, setIsEditingApc] = useState(false);
  const [editedApcValues, setEditedApcValues] = useState<Record<string, string>>({});
  const [editedSubjectGrades, setEditedSubjectGrades] = useState<Record<string, string>>({});

  // Blob cleanup state
  type OrphanedBlob = { url: string; pathname: string; size: number; uploadedAt: string };
  const [blobAudit, setBlobAudit] = useState<{ totalBlobs: number; usedBlobs: number; orphanedCount: number; orphaned: OrphanedBlob[] } | null>(null);
  const [isBlobAuditing, setIsBlobAuditing] = useState(false);
  const [isBlobCleaning, setIsBlobCleaning] = useState(false);
  const [blobCleanupResult, setBlobCleanupResult] = useState<string | null>(null);

  const handleBlobAudit = async () => {
    setIsBlobAuditing(true);
    setBlobAudit(null);
    setBlobCleanupResult(null);
    try {
      const res = await fetch("/api/admin/blob-cleanup");
      const data = await res.json();
      if (data.success) {
        setBlobAudit(data);
      } else {
        setError(data.message || "Blob audit failed.");
      }
    } catch {
      setError("Failed to reach blob audit endpoint.");
    } finally {
      setIsBlobAuditing(false);
    }
  };

  const handleBlobCleanup = async () => {
    if (!blobAudit || blobAudit.orphaned.length === 0) return;
    setIsBlobCleaning(true);
    setBlobCleanupResult(null);
    try {
      const res = await fetch("/api/admin/blob-cleanup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: blobAudit.orphaned.map((b) => b.url) }),
      });
      const data = await res.json();
      if (data.success) {
        setBlobCleanupResult(data.message);
        setBlobAudit(null); // Reset so user can re-audit to confirm
      } else {
        setError(data.message || "Blob cleanup failed.");
      }
    } catch {
      setError("Failed to reach blob cleanup endpoint.");
    } finally {
      setIsBlobCleaning(false);
    }
  };

  const handleBulkUpdateApc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const updates = Object.keys(editedApcValues).map((reportId) => ({
        reportId,
        apc: editedApcValues[reportId],
      }));

      const subjectUpdates = Object.entries(editedSubjectGrades).map(([id, grade]) => ({
        id,
        grade,
      }));

      const res = await fetch(`/api/admin/semester-apc`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates, subjectUpdates }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to update APC values.");
      } else {
        await fetchStudents();
        setIsEditingApc(false);
      }
    } catch (err) {
      setError("Failed to reach APC update endpoint.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportSingleSemesterExcel = async () => {
    if (effectiveSemester === 'ALL' || effectiveSemester <= 0 || analysisStudents.length === 0) return;
    
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Semester ${effectiveSemester} Analysis`);
      
      // 1. Setup Header Information (Title block)
      worksheet.addRow([]);
      
      const titleCell = worksheet.getCell("B2");
      titleCell.value = "SAFI INSTITUTE OF ADVANCED STUDY (AUTONOMOUS)";
      titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF1E293B" } };
      
      const batchCell = worksheet.getCell("B3");
      batchCell.value = `Batch: ${selectedBatch || "BCA2024-28"}`;
      batchCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF475569" } };
      
      const descCell = worksheet.getCell("B4");
      descCell.value = `Semester ${effectiveSemester} Result & Attendance Analysis Report`;
      descCell.font = { name: "Arial", size: 11, italic: true, color: { argb: "FF64748B" } };
      
      worksheet.addRow([]); // Blank spacer
      worksheet.addRow([]); // Blank spacer
      
      // 2. Define Headers
      const headers = ["Roll No", "Register No", "Name"];
      // Add dynamic subject columns
      analysisSubjects.forEach((sub) => {
        headers.push(sub.code);
      });
      headers.push("Grade", "SGPA", "APC", "Remarks");
      
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 28;
      
      // Header styling
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0F172A" } // Dark Slate Theme
        };
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          top: { style: "medium", color: { argb: "FF020617" } },
          bottom: { style: "medium", color: { argb: "FF020617" } },
          left: { style: "thin", color: { argb: "FF475569" } },
          right: { style: "thin", color: { argb: "FF475569" } }
        };
      });
      
      // 3. Populate Rows
      sortedAnalysisStudents.forEach(({ student, semester }) => {
        const rollNo = student.registerNo ? student.registerNo.slice(-2) : "—";
        const gradeMap = new Map((semester?.subjects || []).map(s => [s.subjectCode, s.grade]));
        
        const rowValues: any[] = [
          rollNo,
          student.registerNo,
          student.name
        ];
        
        // Dynamic subject grades
        analysisSubjects.forEach((sub) => {
          const grade = sub.mergedCodes
            ? sub.mergedCodes.reduce<string | undefined>((found, code) => found || gradeMap.get(code), undefined)
            : gradeMap.get(sub.code);
          rowValues.push(grade || "—");
        });
        
        // SGPA, APC, Remarks
        const apcRaw = semester.apc;
        const apcNum = apcRaw ? parseFloat(apcRaw) : null;
        let remark = "—";
        if (apcNum !== null && !isNaN(apcNum)) {
          if (apcNum >= 75) remark = "Eligible";
          else if (apcNum >= 65) remark = "Single Condonation";
          else if (apcNum >= 55) remark = "Double Condonation";
          else remark = "Sem Out";
        }
        
        rowValues.push(
          semester.overallGrade,
          Number(semester.sgpa.toFixed(3)),
          apcNum !== null ? `${apcNum.toFixed(2)}%` : "—",
          remark
        );
        
        const r = worksheet.addRow(rowValues);
        r.height = 20;
        
        // Cell Alignment & styling
        r.eachCell((cell, colNumber) => {
          cell.font = { name: "Arial", size: 10 };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } }
          };
          
          // Left-align name, center everything else
          if (colNumber === 3) {
            cell.alignment = { vertical: "middle", horizontal: "left" };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "center" };
          }
          
          // Color coding for remarks
          const valStr = String(cell.value);
          if (valStr === "Eligible") {
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF059669" } };
          } else if (valStr === "Single Condonation") {
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFD97706" } };
          } else if (valStr === "Double Condonation") {
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFE07A5F" } };
          } else if (valStr === "Sem Out") {
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFDC2626" } };
          }
        });
      });
      
      // 4. Set Intelligent Columns Widths
      worksheet.columns.forEach((column) => {
        let maxLen = 0;
        column.eachCell && column.eachCell({ includeEmpty: false }, (cell) => {
          const rowIdx = Number(cell.row);
          if (rowIdx > 5) {
            const valueStr = cell.value ? String(cell.value) : "";
            if (valueStr.length > maxLen) {
              maxLen = valueStr.length;
            }
          }
        });
        column.width = Math.max(maxLen + 4, 11);
      });
      
      worksheet.getColumn(2).width = 18; // Reg No
      worksheet.getColumn(3).width = 28; // Name
      
      // Write and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Result_Analysis_${selectedBatch || "Report"}_Semester_${effectiveSemester}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      setError("Failed to generate Semester Excel report.");
    }
  };

  const handleExportExcel = async () => {
    if (!allSemestersData || allSemestersData.data.length === 0) return;
    
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("All Semesters Analysis");
      
      // 1. Setup Header Information (Title block)
      worksheet.addRow([]); // Blank row
      
      const titleCell = worksheet.getCell("B2");
      titleCell.value = "SAFI INSTITUTE OF ADVANCED STUDY (AUTONOMOUS)";
      titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF1E293B" } };
      
      const batchCell = worksheet.getCell("B3");
      batchCell.value = `Batch: ${selectedBatch || "BCA2024-28"}`;
      batchCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF475569" } };
      
      const descCell = worksheet.getCell("B4");
      descCell.value = "All Semester Result & Attendance Analysis Report";
      descCell.font = { name: "Arial", size: 11, italic: true, color: { argb: "FF64748B" } };
      
      worksheet.addRow([]); // Blank spacer
      worksheet.addRow([]); // Blank spacer
      
      // 2. Define Headers
      const headers = ["Roll No", "Register No", "Name"];
      for (let sem = 1; sem <= allSemestersData.maxSem; sem++) {
        headers.push(`Sem ${sem} SGPA`);
      }
      headers.push("Avg SGPA (CGPA)", "Percentage", "Rank");
      for (let sem = 1; sem <= allSemestersData.maxSem; sem++) {
        headers.push(`Sem ${sem} APC`, `Sem ${sem} Remarks`);
      }
      
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 28;
      
      // Header styling
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF312E81" } // Dark Indigo theme
        };
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = {
          top: { style: "medium", color: { argb: "FF1E1B4B" } },
          bottom: { style: "medium", color: { argb: "FF1E1B4B" } },
          left: { style: "thin", color: { argb: "FF475569" } },
          right: { style: "thin", color: { argb: "FF475569" } }
        };
      });
      
      // 3. Populate Rows
      allSemestersData.data.forEach((row) => {
        const rollNo = row.student.registerNo ? row.student.registerNo.slice(-2) : "—";
        const rowValues: any[] = [
          rollNo,
          row.student.registerNo,
          row.student.name
        ];
        
        // SGPAs
        for (let sem = 1; sem <= allSemestersData.maxSem; sem++) {
          rowValues.push(row.rowSgpas.has(sem) ? Number(row.rowSgpas.get(sem)!.toFixed(3)) : "—");
        }
        
        rowValues.push(
          Number(row.cgpa.toFixed(3)),
          `${row.percentage.toFixed(2)}%`,
          Number(row.rank)
        );
        
        // APCs and Remarks
        for (let sem = 1; sem <= allSemestersData.maxSem; sem++) {
          const apcRaw = row.rowApc.get(sem);
          const apcNum = apcRaw ? parseFloat(apcRaw) : null;
          let remark = "—";
          if (apcNum !== null && !isNaN(apcNum)) {
            if (apcNum >= 75) remark = "Eligible";
            else if (apcNum >= 65) remark = "Single Condonation";
            else if (apcNum >= 55) remark = "Double Condonation";
            else remark = "Sem Out";
          }
          rowValues.push(
            apcNum !== null ? `${apcNum.toFixed(2)}%` : "—",
            remark
          );
        }
        
        const r = worksheet.addRow(rowValues);
        r.height = 20;
        
        // Cell Alignment & styling
        r.eachCell((cell, colNumber) => {
          cell.font = { name: "Arial", size: 10 };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } }
          };
          
          // Left-align name, center everything else
          if (colNumber === 3) {
            cell.alignment = { vertical: "middle", horizontal: "left" };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "center" };
          }
          
          // Color coding for remarks
          const valStr = String(cell.value);
          if (valStr === "Eligible") {
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF059669" } };
          } else if (valStr === "Single Condonation") {
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFD97706" } };
          } else if (valStr === "Double Condonation") {
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFE07A5F" } };
          } else if (valStr === "Sem Out") {
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFDC2626" } };
          }
        });
      });
      
      // 4. Set Intelligent Columns Widths
      worksheet.columns.forEach((column) => {
        let maxLen = 0;
        column.eachCell && column.eachCell({ includeEmpty: false }, (cell) => {
          // Ignore the first 5 rows (title block) for width calculations
          const rowIdx = Number(cell.row);
          if (rowIdx > 5) {
            const valueStr = cell.value ? String(cell.value) : "";
            if (valueStr.length > maxLen) {
              maxLen = valueStr.length;
            }
          }
        });
        column.width = Math.max(maxLen + 4, 12);
      });
      
      // Specifically widen the Name & Register columns for readability
      worksheet.getColumn(2).width = 18; // Reg No
      worksheet.getColumn(3).width = 28; // Name
      
      // Write and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Result_Analysis_${selectedBatch || "Report"}_All_Semesters.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      setError("Failed to generate Excel report.");
    }
  };

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
      const res = await fetch("/api/students?include=subjects");
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
    if (!verify && !confirm(`Are you sure you want to REJECT Semester ${semesterNumber} marksheet for student ${registerNo}? The uploaded PDF will be permanently deleted from cloud storage.`)) {
      return;
    }

    // Optimistic UI Update
    setStudents(prev => prev.map(st => 
      st.registerNo === registerNo 
        ? { 
            ...st, 
            semesters: st.semesters.map(sem => 
              sem.semesterNumber === semesterNumber 
                ? { ...sem, isVerified: verify, isRejected: !verify } 
                : sem
            ) 
          } 
        : st
    ));
    if (selectedStudent && selectedStudent.registerNo === registerNo) {
      const updatedSemesters = selectedStudent.semesters.map(sem => 
        sem.semesterNumber === semesterNumber 
          ? { ...sem, isVerified: verify, isRejected: !verify } 
          : sem
      );
      setSelectedStudent({ ...selectedStudent, semesters: updatedSemesters });
    }

    try {
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
        fetchStudents(); // Revert optimistic update
      }
    } catch (err) {
      setError("Verification server request failed.");
      fetchStudents(); // Revert optimistic update
    }
  };

  const handleVerifyInternship = async (id: string, verify: boolean) => {
    if (!verify && !confirm("Are you sure you want to REJECT this internship record? The certificate file will be permanently deleted from cloud storage.")) {
      return;
    }

    // Optimistic UI Update
    const previousStudents = JSON.parse(JSON.stringify(students));
    const previousSelected = selectedStudent ? JSON.parse(JSON.stringify(selectedStudent)) : null;

    setStudents(prev => prev.map(st => ({
      ...st,
      internships: st.internships?.map(internship => 
        internship.id === id ? { ...internship, isVerified: verify, isRejected: !verify } : internship
      )
    })));
    if (selectedStudent) {
      const updatedInternships = selectedStudent.internships?.map(internship => 
        internship.id === id ? { ...internship, isVerified: verify, isRejected: !verify } : internship
      ) || [];
      setSelectedStudent({ ...selectedStudent, internships: updatedInternships });
    }

    try {
      const res = await fetch(`/api/admin/internships`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          isVerified: verify,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to update internship verification status.");
        setStudents(previousStudents);
        if (selectedStudent) setSelectedStudent(previousSelected);
      }
    } catch (err) {
      setError("Internship verification server request failed.");
      setStudents(previousStudents);
      if (selectedStudent) setSelectedStudent(previousSelected);
    }
  };

  const handleDeleteInternship = async (id: string) => {
    if (!confirm(`Are you sure you want to delete this internship record?`)) {
      return;
    }

    // Optimistic UI update
    const previousStudents = JSON.parse(JSON.stringify(students));
    const previousSelected = selectedStudent ? JSON.parse(JSON.stringify(selectedStudent)) : null;

    setStudents(prev => prev.map(st => ({
      ...st,
      internships: st.internships?.filter(i => i.id !== id)
    })));
    if (selectedStudent) {
      setSelectedStudent({
        ...selectedStudent,
        internships: selectedStudent.internships?.filter(i => i.id !== id)
      });
    }

    try {
      const res = await fetch(`/api/admin/internships?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to delete internship record.");
        setStudents(previousStudents);
        if (selectedStudent) setSelectedStudent(previousSelected);
      }
    } catch (err) {
      setError("Internship deletion server request failed.");
      setStudents(previousStudents);
      if (selectedStudent) setSelectedStudent(previousSelected);
    }
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      setSavingStudentEdit(true);
      const res = await fetch("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: editingStudent.id,
          registerNo: editRegisterNo,
          name: editName,
          batch: editBatch,
          dob: editDob || undefined,
          password: editPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to update student profile.");
      } else {
        // Optimistically update local students state
        setStudents(prev => prev.map(s => 
          s.id === editingStudent.id 
            ? { ...s, registerNo: editRegisterNo, name: editName, batch: editBatch, dob: editDob || null } 
            : s
        ));
        setEditingStudent(null);
      }
    } catch {
      setError("Failed to connect to server to update student profile.");
    } finally {
      setSavingStudentEdit(false);
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

  // Track internships and pending queue
  interface InternshipQueueItem {
    studentName: string;
    registerNo: string;
    internship: Internship;
  }
  const pendingInternshipsQueue: InternshipQueueItem[] = [];
  let totalPendingInternships = 0;
  let totalVerifiedInternships = 0;

  batchStudents.forEach((student) => {
    student.semesters.forEach((sem) => {
      if (sem.isVerified) {
        totalVerifiedSemesters++;
      } else if (!sem.isRejected) {
        totalPendingSemesters++;
        pendingQueue.push({
          studentName: student.name,
          registerNo: student.registerNo,
          report: sem,
        });
      }
    });

    if (student.internships) {
      student.internships.forEach((internship) => {
        if (internship.isVerified) {
          totalVerifiedInternships++;
        } else if (!internship.isRejected) {
          totalPendingInternships++;
          pendingInternshipsQueue.push({
            studentName: student.name,
            registerNo: student.registerNo,
            internship,
          });
        }
      });
    }

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

  // ─── Result Analysis Spreadsheet Data ───
  const availableSemesters = Array.from(
    new Set(batchStudents.flatMap(s => s.semesters.map(sem => sem.semesterNumber)))
  ).sort((a, b) => a - b);

  const effectiveSemester =
    availableSemesters.length === 0
      ? 0
      : selectedAnalysisSemester === 'ALL'
        ? 'ALL'
        : availableSemesters.includes(selectedAnalysisSemester as number)
          ? selectedAnalysisSemester
          : availableSemesters[0];

  // Data preparation for "All Semesters" view
  const allSemestersData = effectiveSemester === 'ALL' ? (() => {
    const maxSem = availableSemesters.length > 0 ? Math.max(...availableSemesters) : 0;
    const data = batchStudents.map(student => {
      const latestSem = student.semesters.length > 0 ? student.semesters[student.semesters.length - 1] : null;
      const cgpa = latestSem ? latestSem.cgpa : 0;
      const percentage = cgpa > 0 ? cgpa * 10 : 0;
      const rowSgpas = new Map(student.semesters.map(s => [s.semesterNumber, s.sgpa]));
      const rowApc = new Map(student.semesters.map(s => [s.semesterNumber, s.apc || null]));
      return { student, cgpa, percentage, rowSgpas, rowApc };
    }).filter(s => s.cgpa > 0);

    data.sort((a, b) => b.cgpa - a.cgpa);
    let currentRank = 1;
    let rankValues = data.map((d, i) => {
      if (i > 0 && d.cgpa < data[i - 1].cgpa) {
        currentRank = i + 1;
      }
      return { ...d, rank: currentRank };
    });
    return { data: rankValues, maxSem };
  })() : { data: [], maxSem: 0 };

  const analysisStudents = effectiveSemester !== 'ALL' && effectiveSemester > 0
    ? batchStudents
      .filter(s => s.semesters.some(sem => sem.semesterNumber === effectiveSemester))
      .map(s => ({
        student: s,
        semester: s.semesters.find(sem => sem.semesterNumber === effectiveSemester)!,
      }))
    : [];

  const analysisSubjects: { code: string; name: string; mergedCodes?: string[]; mergedNames?: string[] }[] = [];
  const seenSubjectCodes = new Set<string>();
  const mdcCodes: string[] = [];
  const mdcNames: string[] = [];

  // First pass: collect all MDC (105) subject codes and names
  analysisStudents.forEach(({ semester }) => {
    (semester?.subjects || []).forEach(sub => {
      if (sub?.subjectCode?.includes('105') && !mdcCodes.includes(sub.subjectCode)) {
        mdcCodes.push(sub.subjectCode);
        mdcNames.push(sub.subjectName ? (sub.subjectName.split(' - ')[1] || sub.subjectName) : '');
      }
    });
  });

  // Second pass: build columns, merging all 105 subjects into single MDC column
  let mdcInserted = false;
  analysisStudents.forEach(({ semester }) => {
    (semester?.subjects || []).forEach(sub => {
      if (sub?.subjectCode?.includes('105')) {
        if (!mdcInserted) {
          mdcInserted = true;
          analysisSubjects.push({ code: 'MDC', name: 'Multi-Disciplinary Course', mergedCodes: mdcCodes, mergedNames: mdcNames });
        }
      } else if (sub?.subjectCode && !seenSubjectCodes.has(sub.subjectCode)) {
        seenSubjectCodes.add(sub.subjectCode);
        analysisSubjects.push({ code: sub.subjectCode, name: sub.subjectName || '' });
      }
    });
  });

  const GRADE_RANKS: Record<string, number> = {
    "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "P": 4, "F": 0, "—": -1, "-": -1
  };

  const sortedAnalysisStudents = useMemo(() => {
    const list = [...analysisStudents];
    list.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (sortColumn === "regNo") {
        valA = a.student.registerNo;
        valB = b.student.registerNo;
      } else if (sortColumn === "name") {
        valA = a.student.name;
        valB = b.student.name;
      } else if (sortColumn === "sgpa") {
        valA = a.semester.sgpa;
        valB = b.semester.sgpa;
      } else if (sortColumn === "apc") {
        valA = a.semester.apc ? parseFloat(a.semester.apc) : -1;
        valB = b.semester.apc ? parseFloat(b.semester.apc) : -1;
      } else if (sortColumn === "grade") {
        valA = GRADE_RANKS[a.semester.overallGrade] ?? 0;
        valB = GRADE_RANKS[b.semester.overallGrade] ?? 0;
      } else {
        const subA = (a.semester.subjects || []).find(s =>
          sortColumn === "MDC" ? s.subjectCode.includes("105") : s.subjectCode === sortColumn
        );
        const subB = (b.semester.subjects || []).find(s =>
          sortColumn === "MDC" ? s.subjectCode.includes("105") : s.subjectCode === sortColumn
        );
        valA = GRADE_RANKS[subA?.grade || "—"] ?? -1;
        valB = GRADE_RANKS[subB?.grade || "—"] ?? -1;
      }

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDirection === "asc"
        ? (valA > valB ? 1 : valA < valB ? -1 : 0)
        : (valA < valB ? 1 : valA > valB ? -1 : 0);
    });
    return list;
  }, [analysisStudents, sortColumn, sortDirection]);

  if (loading && students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
        <p className="mt-4 text-slate-400 font-medium">Accessing Academic Records Database...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen text-slate-100 bg-slate-950/20">

      {/* Sidebar (Left Column) */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950/60 backdrop-blur-md flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-rose-600/20 border border-rose-500/30 rounded-xl flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-100 block leading-tight">Faculty Admin</span>
            <span className="text-[9px] text-rose-400 uppercase tracking-wider font-semibold block mt-0.5 leading-none">
              BCA Dept Portal
            </span>
          </div>
        </div>

        {/* Batch filter at the top of Sidebar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/10">
          <label className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block mb-1.5 px-1">
            Selected Batch
          </label>
          <div className="relative">
            <Users className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl py-1.5 pl-8 pr-7 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors appearance-none cursor-pointer font-semibold"
            >
              <option value="All">All FYUGP Batches</option>
              {uniqueBatches.map(b => (
                <option key={b} value={b} className="bg-slate-950 text-slate-100">{b}</option>
              ))}
              {students.some(s => !s.batch) && (
                <option value="Legacy" className="bg-slate-950 text-slate-100">Legacy / No Batch</option>
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'dashboard'
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                : 'hover:bg-slate-900/30 text-slate-400 hover:text-slate-200'
              }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('result-analysis')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'result-analysis'
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                : 'hover:bg-slate-900/30 text-slate-400 hover:text-slate-200'
              }`}
          >
            <Table2 className="w-4 h-4 shrink-0" />
            <span>Result Analysis</span>
          </button>

          <button
            onClick={() => setActiveTab('internships')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'internships'
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                : 'hover:bg-slate-900/30 text-slate-400 hover:text-slate-200'
              }`}
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            <span>Internships</span>
            {totalPendingInternships > 0 && (
              <span className="ml-auto text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                {totalPendingInternships}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('student-issues')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'student-issues'
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                : 'hover:bg-slate-900/30 text-slate-400 hover:text-slate-200'
              }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>Student Issues</span>
            <span className="ml-auto text-[9px] bg-slate-900/60 border border-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded-full font-bold">
              {issues.filter(i => i.status === 'PENDING').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('score-cards')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'score-cards'
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                : 'hover:bg-slate-900/30 text-slate-400 hover:text-slate-200'
              }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>Scorecard Builder</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs px-3.5 py-2.5 rounded-xl transition-all font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel (Right Column) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* Top Header */}
        <header className="border-b border-slate-800 bg-slate-950/40 backdrop-blur-md h-16 flex items-center justify-between px-6 shrink-0">
          <div>
            <h2 className="font-extrabold text-base text-slate-100 capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end leading-none text-right">
              <span className="text-xs font-bold text-slate-100">
                {session?.user?.name || "Faculty Administrator"}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                {(session?.user as any)?.email || "admin@safiproject.com"}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center font-bold text-rose-400 text-xs">
              {(session?.user?.name || "A")[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Content Panel */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">

          {error && (
            <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm mb-6">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
              <button className="ml-auto text-rose-300 font-bold" onClick={() => setError("")}>
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
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
                {/* Left Column (2/3 width): Auditing Marksheets Queue & Chart */}
                <div className="lg:col-span-2 space-y-8">

                  {/* Auditing queue list */}
                  <div className="glass-panel rounded-2xl p-6">
                    <h3 className="font-bold text-lg text-slate-200 mb-6 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-rose-400" />
                      Audit Marksheets Queue
                    </h3>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
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
                              onClick={() => handleVerifyReport(item.registerNo, item.report.semesterNumber, false)}
                              className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs px-3 py-1.5 rounded-xl transition-all w-1/2 sm:w-auto font-bold shadow-md"
                            >
                              <X className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                            <button
                              onClick={() => handleVerifyReport(item.registerNo, item.report.semesterNumber, true)}
                              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-xl transition-all w-1/2 sm:w-auto font-bold shadow-md"
                            >
                              <Check className="w-4 h-4" />
                              <span>Approve</span>
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

                  {/* Audit Internships Queue */}
                  <div className="glass-panel rounded-2xl p-6">
                    <h3 className="font-bold text-lg text-slate-200 mb-6 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-rose-400" />
                      Audit Internships Queue
                    </h3>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 scrollbar-hide">
                      {pendingInternshipsQueue.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-700/80 transition-all"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200">{item.studentName}</span>
                              <span className="text-xs text-slate-400">({item.registerNo})</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1 flex gap-3 flex-wrap">
                              <span>Course: <strong>{item.internship.courseName}</strong></span>
                              <span>Hours: <strong className="text-indigo-400">{item.internship.hours} hrs</strong></span>
                              {item.internship.fileName && (
                                <span className="max-w-[200px] truncate block">File: {item.internship.fileName}</span>
                              )}
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
                            <button
                              onClick={() => handleVerifyInternship(item.internship.id, false)}
                              className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs px-3 py-1.5 rounded-xl transition-all w-1/2 sm:w-auto font-bold shadow-md"
                            >
                              <X className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                            <button
                              onClick={() => handleVerifyInternship(item.internship.id, true)}
                              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-xl transition-all w-1/2 sm:w-auto font-bold shadow-md"
                            >
                              <Check className="w-4 h-4" />
                              <span>Approve</span>
                            </button>
                          </div>
                        </div>
                      ))}
                      {pendingInternshipsQueue.length === 0 && (
                        <div className="text-center py-12 text-slate-400 border border-dashed border-slate-800 rounded-xl">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                          <p className="font-semibold text-sm">All Clear! Internship queue is empty.</p>
                          <p className="text-xs text-slate-500 mt-0.5">There are no pending internship certificate audits.</p>
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
                                  onClick={() => {
                                    setEditingStudent(student);
                                    setEditRegisterNo(student.registerNo);
                                    setEditName(student.name);
                                    setEditBatch(student.batch || "");
                                    
                                    // Helper to parse DD-MM-YYYY or similar to YYYY-MM-DD for <input type="date" />
                                    let formattedDob = student.dob || "";
                                    if (formattedDob) {
                                      if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDob)) {
                                        // already YYYY-MM-DD
                                      } else {
                                        const parts = formattedDob.split(/[-/]/);
                                        if (parts.length === 3 && parts[2].length === 4) {
                                          formattedDob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                                        }
                                      }
                                    }
                                    setEditDob(formattedDob);
                                    
                                    setEditPassword("");
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-400 rounded-lg transition-all"
                                  title="Edit Student Register No & Info"
                                >
                                  <Edit2 className="w-4 h-4" />
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

              {/* Blob Storage Cleanup Panel */}
              <div className="glass-panel no-lift rounded-2xl p-6 mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <h3 className="font-bold text-base text-slate-200 flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-amber-400" />
                    Blob Storage Cleanup
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBlobAudit}
                      disabled={isBlobAuditing || isBlobCleaning}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/30 text-slate-300 hover:text-amber-400 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    >
                      {isBlobAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                      {isBlobAuditing ? "Scanning..." : "Scan Storage"}
                    </button>
                    {blobAudit && blobAudit.orphanedCount > 0 && (
                      <button
                        onClick={handleBlobCleanup}
                        disabled={isBlobCleaning}
                        className="flex items-center gap-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                      >
                        {isBlobCleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {isBlobCleaning ? "Deleting..." : `Delete ${blobAudit.orphanedCount} Orphaned Files`}
                      </button>
                    )}
                  </div>
                </div>

                {!blobAudit && !blobCleanupResult && (
                  <p className="text-xs text-slate-500">Click <strong className="text-slate-400">Scan Storage</strong> to detect unused files in Vercel Blob that are no longer referenced in the database.</p>
                )}

                {blobCleanupResult && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {blobCleanupResult}
                  </div>
                )}

                {blobAudit && (
                  <div className="space-y-4">
                    {/* Summary stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-900/40 rounded-xl p-4 text-center border border-slate-800">
                        <p className="text-2xl font-black text-slate-100">{blobAudit.totalBlobs}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-1">Total Files</p>
                      </div>
                      <div className="bg-slate-900/40 rounded-xl p-4 text-center border border-slate-800">
                        <p className="text-2xl font-black text-emerald-400">{blobAudit.usedBlobs}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-1">In Use</p>
                      </div>
                      <div className="bg-slate-900/40 rounded-xl p-4 text-center border border-slate-800">
                        <p className={`text-2xl font-black ${blobAudit.orphanedCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{blobAudit.orphanedCount}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-1">Orphaned</p>
                      </div>
                    </div>

                    {blobAudit.orphanedCount === 0 ? (
                      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Storage is clean — all {blobAudit.totalBlobs} files are in use.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-slate-900/40 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-800">
                              <th className="p-2.5">#</th>
                              <th className="p-2.5">Filename</th>
                              <th className="p-2.5 text-right">Size</th>
                              <th className="p-2.5 text-right">Uploaded</th>
                            </tr>
                          </thead>
                          <tbody>
                            {blobAudit.orphaned.map((blob, i) => (
                              <tr key={blob.url} className="border-b border-slate-800/30 last:border-0 hover:bg-slate-900/10">
                                <td className="p-2.5 text-slate-500 font-semibold">{i + 1}</td>
                                <td className="p-2.5 font-medium text-slate-300 max-w-xs truncate">{blob.pathname}</td>
                                <td className="p-2.5 text-right text-slate-400">{(blob.size / 1024).toFixed(1)} KB</td>
                                <td className="p-2.5 text-right text-slate-400">{new Date(blob.uploadedAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: RESULT ANALYSIS */}
          {activeTab === 'result-analysis' && (
            <div className="glass-panel no-lift rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="font-bold text-lg text-slate-200 flex items-center gap-2">
                  <Table2 className="w-5 h-5 text-rose-400" />
                  Result Analysis — Semester {effectiveSemester || '–'}
                </h3>
                <div className="flex items-center gap-3">
                  {effectiveSemester !== 'ALL' && effectiveSemester > 0 && !isEditingApc && (
                    <button
                      onClick={() => {
                        setIsEditingApc(true);
                        const initialValues: Record<string, string> = {};
                        const initialSubjectGrades: Record<string, string> = {};
                        analysisStudents.forEach(({ semester }) => {
                          initialValues[semester.id] = semester.apc || "";
                          (semester?.subjects || []).forEach((sub) => {
                            initialSubjectGrades[sub.id] = sub.grade || "F";
                          });
                        });
                        setEditedApcValues(initialValues);
                        setEditedSubjectGrades(initialSubjectGrades);
                      }}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-rose-500/20 text-slate-200 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-xl px-4 py-2 text-sm font-semibold transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  )}
                  {effectiveSemester === 'ALL' && allSemestersData.data.length > 0 && (
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export All</span>
                    </button>
                  )}
                  {effectiveSemester !== 'ALL' && effectiveSemester > 0 && !isEditingApc && analysisStudents.length > 0 && (
                    <button
                      onClick={handleExportSingleSemesterExcel}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export Semester</span>
                    </button>
                  )}
                  
                  <div className="relative">
                    <select
                      value={effectiveSemester}
                      disabled={isEditingApc}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedAnalysisSemester(val === 'ALL' ? 'ALL' : Number(val));
                      }}
                    className="bg-slate-900/60 border border-slate-700/60 rounded-xl py-2 pl-4 pr-10 text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition-colors appearance-none cursor-pointer font-semibold"
                  >
                    {availableSemesters.length === 0 && (
                      <option value={0}>No Semesters Available</option>
                    )}
                    {availableSemesters.length > 0 && (
                      <option value="ALL" className="bg-slate-950 font-bold text-rose-400">
                        All Semesters (Overview)
                      </option>
                    )}
                    {availableSemesters.map(sem => (
                      <option key={sem} value={sem} className="bg-slate-950 text-slate-100">
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

              {effectiveSemester === 'ALL' ? (
                allSemestersData.data.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs spreadsheet-table">
                      <thead>
                        <tr className="bg-slate-900/60 text-[10px] text-slate-500 uppercase font-bold border-b-2 border-slate-700">
                          <th className="p-2.5 text-center w-12">Roll No</th>
                          <th className="p-2.5 min-w-[120px]">Reg No</th>
                          <th className="p-2.5 min-w-[150px]">Name</th>
                          {Array.from({ length: allSemestersData.maxSem }, (_, i) => i + 1).map(sem => (
                            <th key={`sgpa-hdr-${sem}`} className="p-2.5 text-center min-w-[70px]">Sem {sem}<br/>SGPA</th>
                          ))}
                          <th className="p-2.5 text-center min-w-[72px] text-emerald-400">Avg SGPA<br/>(CGPA)</th>
                          <th className="p-2.5 text-center min-w-[72px]">Percentage</th>
                          <th className="p-2.5 text-center w-10">Rank</th>
                          {Array.from({ length: allSemestersData.maxSem }, (_, i) => i + 1).map(sem => (
                            <Fragment key={`hdr-group-${sem}`}>
                              <th key={`apc-hdr-${sem}`} className="p-2.5 text-center min-w-[60px] text-sky-400">Sem {sem}<br/>APC</th>
                              <th key={`rmk-hdr-${sem}`} className="p-2.5 text-center min-w-[110px] text-amber-400">Sem {sem}<br/>Remarks</th>
                            </Fragment>
                          ))}
                          <th className="p-2.5 text-center w-14"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSemestersData.data.map((row) => {
                          const rollNo = row.student.registerNo ? row.student.registerNo.slice(-2) : "—";
                          return (
                            <tr key={row.student.id} className="border-b border-slate-800/30 last:border-0 hover:bg-slate-800/20 transition-colors">
                              <td className="p-2.5 text-center font-bold text-slate-300">{rollNo}</td>
                              <td className="p-2.5 font-semibold text-indigo-400 whitespace-nowrap">{row.student.registerNo}</td>
                              <td className="p-2.5 text-slate-200 font-medium">{row.student.name}</td>
                              {Array.from({ length: allSemestersData.maxSem }, (_, i) => i + 1).map(sem => (
                                <td key={`sgpa-${sem}`} className="p-2.5 text-center font-bold text-slate-100">
                                  {row.rowSgpas.has(sem) ? row.rowSgpas.get(sem)!.toFixed(3) : <span className="text-slate-600">—</span>}
                                </td>
                              ))}
                              <td className="p-2.5 text-center font-bold text-emerald-400">{row.cgpa.toFixed(3)}</td>
                              <td className="p-2.5 text-center font-bold text-sky-400">{row.percentage.toFixed(2)}%</td>
                              <td className="p-2.5 text-center font-bold text-rose-400">{row.rank}</td>
                              {Array.from({ length: allSemestersData.maxSem }, (_, i) => i + 1).map(sem => {
                                const apcRaw = row.rowApc.get(sem);
                                const apcNum = apcRaw ? parseFloat(apcRaw) : null;
                                let remark = '';
                                let remarkClass = 'text-slate-500';
                                if (apcNum !== null && !isNaN(apcNum)) {
                                  if (apcNum >= 75) { remark = 'Eligible'; remarkClass = 'text-emerald-400'; }
                                  else if (apcNum >= 65) { remark = 'Single Condonation'; remarkClass = 'text-yellow-400'; }
                                  else if (apcNum >= 55) { remark = 'Double Condonation'; remarkClass = 'text-orange-400'; }
                                  else { remark = 'Sem Out'; remarkClass = 'text-rose-500'; }
                                }
                                return (
                                  <Fragment key={`sem-group-${sem}`}>
                                    <td key={`apc-${sem}`} className="p-2.5 text-center font-semibold text-sky-400">
                                      {apcNum !== null ? `${apcNum.toFixed(2)}%` : <span className="text-slate-600">—</span>}
                                    </td>
                                    <td key={`rmk-${sem}`} className={`p-2.5 text-center text-[10px] font-bold whitespace-nowrap ${remarkClass}`}>
                                      {remark || <span className="text-slate-600">—</span>}
                                    </td>
                                  </Fragment>
                                );
                              })}
                              <td className="p-2.5 text-center">
                                <button
                                  onClick={() => {
                                    setSelectedStudent(row.student);
                                    setIsViewingTranscript(true);
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-lg transition-all"
                                  title="View All Semesters"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 border border-dashed border-slate-800 rounded-xl">
                    <Table2 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <p className="font-semibold text-sm">No results available.</p>
                    <p className="text-xs text-slate-500 mt-0.5">No students have uploaded marksheets yet.</p>
                  </div>
                )
              ) : analysisStudents.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs spreadsheet-table">
                    <thead>
                      <tr className="bg-slate-900/60 text-[10px] text-slate-500 uppercase font-bold border-b-2 border-slate-700">
                        <th className="p-2.5 text-center w-10">#</th>
                        <th className="p-2.5 min-w-[120px] cursor-pointer select-none hover:text-slate-200" onClick={() => handleSort("regNo")}>
                          Reg No {renderSortIndicator("regNo")}
                        </th>
                        <th className="p-2.5 min-w-[150px] cursor-pointer select-none hover:text-slate-200" onClick={() => handleSort("name")}>
                          Name {renderSortIndicator("name")}
                        </th>
                        {analysisSubjects.map(sub => (
                          <th
                            key={sub.code}
                            className="p-2.5 text-center min-w-[70px] cursor-pointer select-none hover:text-slate-200"
                            title={sub.mergedNames ? sub.mergedNames.join(', ') : (sub.name.split(' - ')[1] || sub.name)}
                            onClick={() => handleSort(sub.code)}
                          >
                            {sub.code} {renderSortIndicator(sub.code)}
                          </th>
                        ))}
                        <th className="p-2.5 text-center min-w-[72px] cursor-pointer select-none hover:text-slate-200" onClick={() => handleSort("grade")}>
                          Grade {renderSortIndicator("grade")}
                        </th>
                        <th className="p-2.5 text-center min-w-[72px] cursor-pointer select-none hover:text-slate-200" onClick={() => handleSort("sgpa")}>
                          SGPA {renderSortIndicator("sgpa")}
                        </th>
                        <th className="p-2.5 text-center min-w-[120px] cursor-pointer select-none hover:text-slate-200" title="Attendance, Progress, and Conduct" onClick={() => handleSort("apc")}>
                          APC {renderSortIndicator("apc")}
                        </th>
                        <th className="p-2.5 text-center w-14"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAnalysisStudents.map(({ student, semester }, idx) => {
                        const gradeMap = new Map((semester?.subjects || []).map(s => [s.subjectCode, s.grade]));
                        return (
                          <tr key={student.id} className="border-b border-slate-800/30 last:border-0">
                            <td className="p-2.5 text-center font-semibold text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-semibold text-indigo-400 whitespace-nowrap">{student.registerNo}</td>
                            <td className="p-2.5 text-slate-200 font-medium">{student.name}</td>
                             {analysisSubjects.map(sub => {
                              const matchedSubject = (semester?.subjects || []).find(s => 
                                sub.mergedCodes ? sub.mergedCodes.includes(s.subjectCode) : s.subjectCode === sub.code
                              );
                              
                              if (isEditingApc && matchedSubject) {
                                return (
                                  <td key={sub.code} className="p-2.5 text-center">
                                    <select
                                      value={editedSubjectGrades[matchedSubject.id] || "F"}
                                      onChange={(e) =>
                                        setEditedSubjectGrades((prev) => ({
                                          ...prev,
                                          [matchedSubject.id]: e.target.value,
                                        }))
                                      }
                                      className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-rose-500"
                                    >
                                      {["O", "A+", "A", "B+", "B", "C", "P", "F"].map((g) => (
                                        <option key={g} value={g} className="bg-slate-950 text-slate-100">{g}</option>
                                      ))}
                                    </select>
                                  </td>
                                );
                              }
                              
                              const grade = matchedSubject ? matchedSubject.grade : undefined;
                              return (
                                <td key={sub.code} className="p-2.5 text-center font-bold text-slate-100">
                                  {grade || <span className="text-slate-600">—</span>}
                                </td>
                              );
                            })}
                            <td className="p-2.5 text-center font-bold text-slate-100">{semester.overallGrade}</td>
                            <td className="p-2.5 text-center font-bold text-emerald-400">{semester.sgpa.toFixed(3)}</td>
                            <td className="p-2.5 text-center">
                              {isEditingApc ? (
                                <input
                                  type="number"
                                  id={`apc-input-${idx}`}
                                  min={0}
                                  max={100}
                                  step={0.01}
                                  value={editedApcValues[semester.id] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const num = parseFloat(val);
                                    if (val === '' || (!isNaN(num) && num >= 0 && num <= 100)) {
                                      setEditedApcValues((prev) => ({
                                        ...prev,
                                        [semester.id]: val,
                                      }));
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "ArrowUp") {
                                      e.preventDefault();
                                      const prevInput = document.getElementById(`apc-input-${idx - 1}`) as HTMLInputElement;
                                      if (prevInput) prevInput.focus();
                                    } else if (e.key === "ArrowDown" || e.key === "Enter") {
                                      e.preventDefault();
                                      const nextInput = document.getElementById(`apc-input-${idx + 1}`) as HTMLInputElement;
                                      if (nextInput) nextInput.focus();
                                    }
                                  }}
                                  placeholder="0–100"
                                  className="w-full max-w-[80px] bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-rose-500 transition-colors text-center font-semibold"
                                />
                              ) : (
                                <span className="font-semibold text-sky-400">
                                  {semester.apc ? `${parseFloat(semester.apc)}%` : <span className="text-slate-600">—</span>}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setIsViewingTranscript(true);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-lg transition-all"
                                title="View All Semesters"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {isEditingApc && (
                    <div className="bg-slate-950/40 p-4 border-t border-slate-800 flex justify-end gap-3 rounded-b-xl">
                      <button
                        type="button"
                        onClick={() => setIsEditingApc(false)}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl transition-all font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkUpdateApc}
                        disabled={loading}
                        className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs px-5 py-2 rounded-xl transition-all font-bold disabled:opacity-50"
                      >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Submit APC Records</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 border border-dashed border-slate-800 rounded-xl">
                  <Table2 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="font-semibold text-sm">No results available for this semester.</p>
                  <p className="text-xs text-slate-500 mt-0.5">No students have uploaded marksheets for the selected semester.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INTERNSHIPS */}
          {activeTab === 'internships' && (
            <div className="space-y-6">

              {/* Verified Internships List */}
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="font-bold text-lg text-slate-200 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-rose-400" />
                  Verified Internships Record
                </h3>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900/60 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-700">
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Register No</th>
                        <th className="p-3">Course / Internship Name</th>
                        <th className="p-3 text-center">Hours Completed</th>
                        <th className="p-3 text-center">Certificate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchStudents
                        .filter(s => (s.internships || []).some(i => i.isVerified))
                        .map((student, idx) => {
                          const verifiedInternships = student.internships.filter(i => i.isVerified);
                          const totalHours = verifiedInternships.reduce((sum, i) => sum + (i.hours || 0), 0);
                          const courseNames = verifiedInternships.map(i => i.courseName).join(", ");

                          return (
                            <tr key={idx} className="border-b border-slate-800/30 last:border-0 hover:bg-slate-800/10">
                              <td className="p-3 font-semibold text-slate-200">{student.name}</td>
                              <td className="p-3 font-bold text-indigo-400">{student.registerNo}</td>
                              <td className="p-3 text-slate-300">{courseNames}</td>
                              <td className="p-3 text-center font-bold text-emerald-400">{totalHours} hrs</td>
                              <td className="p-3 text-center">
                                <div className="flex flex-wrap items-center justify-center gap-1.5">
                                  {verifiedInternships.map((internship, iIdx) => internship.fileUrl && (
                                    <a
                                      key={iIdx}
                                      href={`/api/view-file?url=${encodeURIComponent(internship.fileUrl)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2 py-1 rounded-lg font-bold"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      View {verifiedInternships.length > 1 ? `#${iIdx + 1}` : ''}
                                    </a>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      {batchStudents.every(s => !(s.internships || []).some(i => i.isVerified)) && (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-slate-500 text-xs font-semibold">
                            No verified internship records found for this batch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: STUDENT ISSUES */}
          {activeTab === 'student-issues' && (
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
                  {issues.filter(i => i.status === 'PENDING').length} Unresolved
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
                        <td className="p-3.5 font-semibold text-indigo-400 whitespace-nowrap">
                          {issue.registerNo}
                        </td>
                        <td className="p-3.5 text-slate-200 font-bold">
                          {issue.studentName}
                        </td>
                        <td className="p-3.5 text-slate-100 font-semibold">
                          {issue.subject}
                        </td>
                        <td className="p-3.5 text-slate-400 max-w-sm truncate" title={issue.description}>
                          {issue.description}
                        </td>
                        <td className="p-3.5 text-center">
                          {issue.status === 'RESOLVED' ? (
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
                            onClick={() => handleResolveIssue(issue.id)}
                            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${issue.status === 'RESOLVED'
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold'
                                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-transparent font-bold'
                              }`}
                          >
                            {issue.status === 'RESOLVED' ? "Reopen" : "Resolve"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'score-cards' && (
            <ScorecardBuilder
              students={students as any}
              availableBatches={uniqueBatches}
              currentBatch={selectedBatch}
              onBatchChange={setSelectedBatch}
            />
          )}
        </main>
      </div>

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
                            View Marks PDF
                          </a>
                        )
                      )}

                      {sem.isVerified ? (
                        <button
                          onClick={() => handleVerifyReport(selectedStudent.registerNo, sem.semesterNumber, false)}
                          className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 text-emerald-400 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
                          title="Revoke Verification status"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approved & Verified</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerifyReport(selectedStudent.registerNo, sem.semesterNumber, true)}
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

              {selectedStudent.semesters.length === 0 && (
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
                {selectedStudent.internships && selectedStudent.internships.length > 0 ? (
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
                        {selectedStudent.internships.map((internship) => (
                          <tr key={internship.id} className="border-b border-slate-800/30 last:border-0 hover:bg-slate-900/10">
                            <td className="p-3 font-semibold text-slate-200">{internship.courseName}</td>
                            <td className="p-3 text-center font-medium text-slate-300">{internship.hours} hrs</td>
                            <td className="p-3 text-center">
                              {internship.isVerified ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                                  <Clock className="w-3 h-3 animate-pulse" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {internship.fileUrl && (
                                  <a
                                    href={`/api/view-file?url=${encodeURIComponent(internship.fileUrl)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-lg transition-all font-semibold flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    View
                                  </a>
                                )}
                                {internship.isVerified ? (
                                  <button
                                    onClick={() => handleVerifyInternship(internship.id, false)}
                                    className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 text-emerald-400 text-xs px-2 py-1 rounded-lg transition-all font-bold"
                                    title="Revoke approval"
                                  >
                                    Verified
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleVerifyInternship(internship.id, true)}
                                    className="bg-amber-500/10 hover:bg-emerald-600 hover:text-white border border-amber-500/20 hover:border-transparent text-amber-400 text-xs px-2 py-1 rounded-lg transition-all font-bold"
                                  >
                                    Approve
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteInternship(internship.id)}
                                  className="bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg transition-all font-semibold"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
                    No internship records uploaded yet.
                  </div>
                )}
              </div>
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

      {/* Edit Student Profile Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-400" />
                Edit Student Profile
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Register Number
                </label>
                <input
                  type="text"
                  required
                  value={editRegisterNo}
                  onChange={e => setEditRegisterNo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 font-bold focus:outline-none focus:border-indigo-500 text-sm"
                  placeholder="e.g. SIAYBCA001"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Student Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Batch Name
                </label>
                <input
                  type="text"
                  value={editBatch}
                  onChange={e => setEditBatch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. 2024-2028"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Date of Birth (DOB) Calendar
                </label>
                <input
                  type="date"
                  value={editDob}
                  onChange={e => setEditDob(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer date-input-picker"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Selecting a date updates the student's default login password to their DOB.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStudentEdit}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {savingStudentEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
