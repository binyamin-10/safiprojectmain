"use client";

import { useState, useCallback } from "react";
import type { Student, BlobAuditResult } from "@/types/admin";

export interface UseAdminStudentsReturn {
  // State
  students: Student[];
  loading: boolean;
  error: string;
  verifyingKey: string | null;
  selectedStudent: Student | null;
  isViewingTranscript: boolean;
  blobAudit: BlobAuditResult | null;
  isBlobAuditing: boolean;
  isBlobCleaning: boolean;
  blobCleanupResult: string | null;

  // Setters
  setError: (msg: string) => void;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  setSelectedStudent: React.Dispatch<React.SetStateAction<Student | null>>;
  setIsViewingTranscript: (v: boolean) => void;

  // Actions
  fetchStudents: () => Promise<void>;
  handleVerifyReport: (registerNo: string, semesterNumber: number, verify: boolean) => Promise<void>;
  handleVerifyInternship: (id: string, verify: boolean) => Promise<void>;
  handleDeleteInternship: (id: string) => Promise<void>;
  handleDeleteStudent: (registerNo: string) => Promise<void>;
  handleBulkUpdateApc: (
    editedApcValues: Record<string, string>,
    editedSubjectGrades: Record<string, string>
  ) => Promise<void>;
  handleBlobAudit: () => Promise<void>;
  handleBlobCleanup: (orphanedUrls: string[]) => Promise<void>;
}

/**
 * Custom hook that owns ALL admin data state and async action handlers.
 * Components stay purely presentational — no fetch logic in JSX files.
 */
export function useAdminStudents(): UseAdminStudentsReturn {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifyingKey, setVerifyingKey] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isViewingTranscript, setIsViewingTranscript] = useState(false);
  const [blobAudit, setBlobAudit] = useState<BlobAuditResult | null>(null);
  const [isBlobAuditing, setIsBlobAuditing] = useState(false);
  const [isBlobCleaning, setIsBlobCleaning] = useState(false);
  const [blobCleanupResult, setBlobCleanupResult] = useState<string | null>(null);

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/students?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load database.");
      const data = await res.json();
      if (Array.isArray(data)) {
        setStudents(data);
      } else {
        setError(data?.message || "Failed to load database.");
      }
    } catch {
      setError("Failed to fetch students dataset.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Verify Marksheet ────────────────────────────────────────────────────
  const handleVerifyReport = useCallback(
    async (registerNo: string, semesterNumber: number, verify: boolean) => {
      if (
        verify === false &&
        !window.confirm(
          `Are you sure you want to reject Semester ${semesterNumber} marksheet for student (${registerNo})? This will permanently delete the uploaded PDF from storage.`
        )
      )
        return;

      const key = `${registerNo}-sem-${semesterNumber}`;
      setVerifyingKey(key);

      // Optimistic update
      const patchSemesters = (sems: Student["semesters"]) =>
        sems.map((sem) =>
          sem.semesterNumber === semesterNumber
            ? {
                ...sem,
                isVerified: verify,
                isRejected: !verify,
                fileUrl: verify === false ? null : sem.fileUrl,
                fileName: verify === false ? null : sem.fileName,
              }
            : sem
        );

      setStudents((prev) =>
        prev.map((st) =>
          st.registerNo === registerNo ? { ...st, semesters: patchSemesters(st.semesters) } : st
        )
      );
      setSelectedStudent((prev) =>
        prev?.registerNo === registerNo ? { ...prev, semesters: patchSemesters(prev.semesters) } : prev
      );

      try {
        const res = await fetch(`/api/students/${registerNo}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ semesterNumber, isVerified: verify }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || "Failed to update verification status.");
          fetchStudents();
        }
      } catch {
        setError("Verification server request failed.");
        fetchStudents();
      } finally {
        setVerifyingKey(null);
      }
    },
    [fetchStudents]
  );

  // ─── Verify Internship ───────────────────────────────────────────────────
  const handleVerifyInternship = useCallback(
    async (id: string, verify: boolean) => {
      if (
        verify === false &&
        !window.confirm(
          "Are you sure you want to reject this internship certificate? This will permanently delete the uploaded PDF from storage."
        )
      )
        return;

      setVerifyingKey(`internship-${id}`);

      const patchInternships = (internships: Student["internships"]) =>
        internships?.map((i) =>
          i.id === id ? { ...i, isVerified: verify, isRejected: !verify } : i
        ) ?? [];

      setStudents((prev) => prev.map((st) => ({ ...st, internships: patchInternships(st.internships) })));
      setSelectedStudent((prev) =>
        prev ? { ...prev, internships: patchInternships(prev.internships) } : null
      );

      try {
        const res = await fetch("/api/admin/internships", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, isVerified: verify }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || "Failed to update internship verification status.");
          fetchStudents();
        }
      } catch {
        setError("Internship verification server request failed.");
        fetchStudents();
      } finally {
        setVerifyingKey(null);
      }
    },
    [fetchStudents]
  );

  // ─── Delete Internship ───────────────────────────────────────────────────
  const handleDeleteInternship = useCallback(
    async (id: string) => {
      if (!window.confirm("Are you sure you want to delete this internship record?")) return;

      // Optimistic removal
      setStudents((prev) =>
        prev.map((st) => ({ ...st, internships: st.internships?.filter((i) => i.id !== id) ?? [] }))
      );
      setSelectedStudent((prev) =>
        prev ? { ...prev, internships: prev.internships?.filter((i) => i.id !== id) ?? [] } : null
      );

      try {
        const res = await fetch(`/api/admin/internships?id=${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || "Failed to delete internship record.");
          fetchStudents();
        }
      } catch {
        setError("Internship delete server request failed.");
        fetchStudents();
      }
    },
    [fetchStudents]
  );

  // ─── Delete Student ──────────────────────────────────────────────────────
  const handleDeleteStudent = useCallback(
    async (registerNo: string) => {
      if (
        !window.confirm(
          `Are you absolutely sure you want to delete the profile of student ${registerNo}? This action is irreversible.`
        )
      )
        return;

      try {
        setLoading(true);
        const res = await fetch(`/api/students/${registerNo}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || "Failed to delete student record.");
        } else {
          setStudents((prev) => prev.filter((s) => s.registerNo !== registerNo));
          if (selectedStudent?.registerNo === registerNo) {
            setIsViewingTranscript(false);
            setSelectedStudent(null);
          }
        }
      } catch {
        setError("Delete server request failed.");
      } finally {
        setLoading(false);
      }
    },
    [selectedStudent, fetchStudents]
  );

  // ─── Bulk APC + Grades Update ────────────────────────────────────────────
  const handleBulkUpdateApc = useCallback(
    async (editedApcValues: Record<string, string>, editedSubjectGrades: Record<string, string>) => {
      const updates = Object.keys(editedApcValues).map((reportId) => ({
        reportId,
        apc: editedApcValues[reportId],
      }));
      const subjectUpdates = Object.entries(editedSubjectGrades).map(([id, grade]) => ({ id, grade }));

      // Instant optimistic state update (0ms latency)
      setStudents((prev) =>
        prev.map((st) => ({
          ...st,
          semesters: st.semesters.map((sem) => {
            const updatedSem = { ...sem };
            if (editedApcValues[sem.id] !== undefined) updatedSem.apc = editedApcValues[sem.id];
            if (updatedSem.subjects) {
              updatedSem.subjects = updatedSem.subjects.map((sub) =>
                editedSubjectGrades[sub.id] ? { ...sub, grade: editedSubjectGrades[sub.id] } : sub
              );
            }
            return updatedSem;
          }),
        }))
      );

      try {
        setLoading(true);
        const res = await fetch("/api/admin/semester-apc", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates, subjectUpdates }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || "Failed to update APC values.");
          fetchStudents();
        } else {
          // Sync server SGPA/CGPA recalculations silently in background
          fetchStudents().catch(() => {});
        }
      } catch {
        setError("Failed to reach APC update endpoint.");
        fetchStudents();
      } finally {
        setLoading(false);
      }
    },
    [fetchStudents]
  );

  // ─── Blob Audit ──────────────────────────────────────────────────────────
  const handleBlobAudit = useCallback(async () => {
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
  }, []);

  // ─── Blob Cleanup ─────────────────────────────────────────────────────────
  const handleBlobCleanup = useCallback(async (orphanedUrls: string[]) => {
    setIsBlobCleaning(true);
    setBlobCleanupResult(null);
    try {
      const res = await fetch("/api/admin/blob-cleanup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: orphanedUrls }),
      });
      const data = await res.json();
      if (data.success) {
        setBlobCleanupResult(data.message);
        setBlobAudit(null);
      } else {
        setError(data.message || "Blob cleanup failed.");
      }
    } catch {
      setError("Failed to reach blob cleanup endpoint.");
    } finally {
      setIsBlobCleaning(false);
    }
  }, []);

  return {
    students,
    loading,
    error,
    verifyingKey,
    selectedStudent,
    isViewingTranscript,
    blobAudit,
    isBlobAuditing,
    isBlobCleaning,
    blobCleanupResult,
    setError,
    setStudents,
    setSelectedStudent,
    setIsViewingTranscript,
    fetchStudents,
    handleVerifyReport,
    handleVerifyInternship,
    handleDeleteInternship,
    handleDeleteStudent,
    handleBulkUpdateApc,
    handleBlobAudit,
    handleBlobCleanup,
  };
}
