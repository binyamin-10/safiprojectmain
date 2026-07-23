// ─── Admin Portal Shared Types ───────────────────────────────────────────────

export interface Subject {
  id: string;
  subjectCode: string;
  subjectName: string;
  grade: string;
  gradePoint: number;
  credits: number;
  creditPoint: number;
  status: string;
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
  apc?: string | null;
  grievance?: string | null;
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
  userId: string;
  user?: {
    name: string;
    registerNo: string;
    batch?: string | null;
  };
}

export interface Student {
  id: string;
  registerNo: string;
  name: string;
  batch?: string | null;
  dob?: string | null;
  createdAt: string;
  semesters: SemesterReport[];
  internships: Internship[];
}

export interface OrphanedBlob {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

export interface BlobAuditResult {
  totalBlobs: number;
  usedBlobs: number;
  orphanedCount: number;
  orphaned: OrphanedBlob[];
}

export interface StudentIssue {
  id: string;
  registerNo: string;
  studentName: string;
  subject: string;
  description: string;
  status: "PENDING" | "RESOLVED";
  createdAt: string;
}

export interface PendingQueueItem {
  studentName: string;
  registerNo: string;
  report: SemesterReport;
}

export interface InternshipQueueItem {
  studentName: string;
  registerNo: string;
  internship: Internship;
}

export type TabType = "dashboard" | "result-analysis" | "internships" | "student-issues" | "score-cards";
export type SortField = "rollNo" | "name" | "rank";
export type SortOrder = "asc" | "desc";

export interface AnalysisStudent {
  student: Student;
  semester: SemesterReport;
  rank?: number;
}

export interface AllSemestersRow {
  student: Student;
  cgpa: number;
  percentage: number;
  rowSgpas: Map<number, number>;
  rowApc: Map<number, string | null>;
  rank: number;
}

export interface AnalysisSubjectColumn {
  code: string;
  name: string;
  mergedCodes?: string[];
  mergedNames?: string[];
}
