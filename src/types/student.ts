// ─── Student Portal Shared Types ─────────────────────────────────────────────

export interface Subject {
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

export interface SemesterReport {
  id: string;
  semesterNumber: number;
  sgpa: number;
  cgpa: number;
  overallGrade: string;
  status: string;
  fileName: string | null;
  fileUrl: string | null;
  isVerified: boolean;
  isRejected: boolean;
  subjects: Subject[];
}

export interface Internship {
  id: string;
  courseName: string;
  hours: number;
  fileName: string | null;
  fileUrl: string | null;
  isVerified: boolean;
  isRejected: boolean;
  createdAt: string;
}

export interface StudentData {
  id: string;
  name: string;
  registerNo: string;
  semesters: SemesterReport[];
  internships: Internship[];
}

export interface OcrData {
  semester: number;
  sgpa: number;
  overallGrade: string;
  status: string;
  fileName: string;
  fileUrl: string;
  subjects: Subject[];
}

export type StudentTabType = "dashboard" | "semesters" | "internships";
