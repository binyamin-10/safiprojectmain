"use client";

import { useState, useCallback, useRef } from "react";
import type { StudentData, OcrData } from "@/types/student";
import { GRADE_POINTS, computeOverallGrade } from "@/lib/utils";

export interface UseStudentDataReturn {
  // State
  student: StudentData | null;
  loading: boolean;
  error: string;
  scanning: boolean;
  uploadingInternship: boolean;
  ocrData: OcrData | null;
  isVerifying: boolean;
  showGrievanceInput: boolean;
  grievanceText: string;
  uploadSemester: number;
  uploadFile: File | null;
  internshipCourse: string;
  internshipHours: string;
  internshipFile: File | null;
  expandedSemesters: Record<number, boolean>;
  isPrintView: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  internshipFileInputRef: React.RefObject<HTMLInputElement | null>;

  // Setters
  setError: (msg: string) => void;
  setUploadSemester: (n: number) => void;
  setUploadFile: (f: File | null) => void;
  setInternshipCourse: (s: string) => void;
  setInternshipHours: (s: string) => void;
  setInternshipFile: (f: File | null) => void;
  setShowGrievanceInput: (v: boolean) => void;
  setGrievanceText: (s: string) => void;
  setIsVerifying: (v: boolean) => void;
  setOcrData: (d: OcrData | null) => void;
  setIsPrintView: (v: boolean) => void;
  toggleExpand: (semNum: number) => void;

  // Actions
  fetchStudentData: () => Promise<void>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  triggerUpload: (e: React.FormEvent) => Promise<void>;
  handleInternshipFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  submitInternship: (e: React.FormEvent) => Promise<void>;
  handleGradeChange: (index: number, newGrade: string) => void;
  saveVerifiedSemester: () => Promise<void>;
}

/**
 * Custom hook that owns ALL student portal data state and async handlers.
 * The student dashboard page becomes a thin ~100-line coordinator.
 */
export function useStudentData(registerNo: string, studentName: string): UseStudentDataReturn {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [uploadingInternship, setUploadingInternship] = useState(false);
  const [ocrData, setOcrData] = useState<OcrData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showGrievanceInput, setShowGrievanceInput] = useState(false);
  const [grievanceText, setGrievanceText] = useState("");
  const [uploadSemester, setUploadSemester] = useState(1);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [internshipCourse, setInternshipCourse] = useState("");
  const [internshipHours, setInternshipHours] = useState("");
  const [internshipFile, setInternshipFile] = useState<File | null>(null);
  const [expandedSemesters, setExpandedSemesters] = useState<Record<number, boolean>>({});
  const [isPrintView, setIsPrintView] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const internshipFileInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchStudentData = useCallback(async () => {
    if (!registerNo) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/students/${registerNo}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to fetch student details.");
      } else {
        setStudent(data.student);
        // Default to first un-uploaded semester
        const uploaded = data.student.semesters.map((s: any) => s.semesterNumber);
        let next = 1;
        for (let i = 1; i <= 8; i++) {
          if (!uploaded.includes(i)) { next = i; break; }
        }
        setUploadSemester(next);
      }
    } catch {
      setError("An error occurred loading academic data.");
    } finally {
      setLoading(false);
    }
  }, [registerNo]);

  // ─── Marksheet Upload ──────────────────────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only official PDF files from SAFI College are accepted.");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploadFile(file);
    setError("");
  }, []);

  const triggerUpload = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setScanning(true);
    setError("");

    const formData = new FormData();
    formData.append("marksheet", uploadFile);
    formData.append("semester", uploadSemester.toString());
    formData.append("registerNo", registerNo);
    formData.append("studentName", studentName);

    try {
      const res = await fetch("/api/upload-marksheet", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to scan marksheet.");
      } else {
        setOcrData(data.ocrData);
        setIsVerifying(true);
      }
    } catch {
      setError("OCR Scanner connection failed.");
    } finally {
      setScanning(false);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [uploadFile, uploadSemester, registerNo, studentName]);

  // ─── Internship Upload ─────────────────────────────────────────────────────
  const handleInternshipFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only official PDF certificate files are accepted.");
      setInternshipFile(null);
      if (internshipFileInputRef.current) internshipFileInputRef.current.value = "";
      return;
    }
    setInternshipFile(file);
    setError("");
  }, []);

  const submitInternship = useCallback(async (e: React.FormEvent) => {
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
      const res = await fetch("/api/internships", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to upload internship certificate.");
      } else {
        setInternshipCourse("");
        setInternshipHours("");
        setInternshipFile(null);
        if (internshipFileInputRef.current) internshipFileInputRef.current.value = "";
        fetchStudentData();
      }
    } catch {
      setError("Internship upload connection failed.");
    } finally {
      setUploadingInternship(false);
    }
  }, [internshipCourse, internshipHours, internshipFile, fetchStudentData]);

  // ─── OCR Grade Correction (client-side SGPA recalculation) ─────────────────
  const handleGradeChange = useCallback((index: number, newGrade: string) => {
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

    let totalCredits = 0;
    let totalGP = 0;
    let hasFailed = false;

    updatedSubjects.forEach(sub => {
      totalCredits += sub.credits;
      totalGP += sub.creditPoint;
      if (sub.grade === "F") hasFailed = true;
    });

    const newSgpa = totalCredits > 0 ? parseFloat((totalGP / totalCredits).toFixed(3)) : 0;

    setOcrData({
      ...ocrData,
      subjects: updatedSubjects,
      sgpa: newSgpa,
      overallGrade: computeOverallGrade(newSgpa, hasFailed),
      status: hasFailed ? "Fail" : "Pass",
    });
  }, [ocrData]);

  // ─── Save Verified Semester ─────────────────────────────────────────────────
  const saveVerifiedSemester = useCallback(async () => {
    if (!ocrData) return;

    try {
      setLoading(true);
      const res = await fetch("/api/students/save-semester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registerNo,
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
        fetchStudentData();
      }
    } catch {
      setError("Failed to save verified grades.");
    } finally {
      setLoading(false);
    }
  }, [ocrData, registerNo, showGrievanceInput, grievanceText, fetchStudentData]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const toggleExpand = useCallback((semNum: number) => {
    setExpandedSemesters(prev => ({ ...prev, [semNum]: !prev[semNum] }));
  }, []);

  return {
    student, loading, error, scanning, uploadingInternship, ocrData, isVerifying,
    showGrievanceInput, grievanceText, uploadSemester, uploadFile, internshipCourse,
    internshipHours, internshipFile, expandedSemesters, isPrintView,
    fileInputRef, internshipFileInputRef,
    setError, setUploadSemester, setUploadFile, setInternshipCourse, setInternshipHours,
    setInternshipFile, setShowGrievanceInput, setGrievanceText, setIsVerifying,
    setOcrData, setIsPrintView, toggleExpand,
    fetchStudentData, handleFileChange, triggerUpload, handleInternshipFileChange,
    submitInternship, handleGradeChange, saveVerifiedSemester,
  };
}
