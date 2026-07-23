"use client";

import { Printer } from "lucide-react";
import type { StudentData } from "@/types/student";

interface TranscriptViewProps {
  student: StudentData;
  overallCgpa: number;
  totalCreditsCompleted: number;
  honoursTargetCredits: number;
  onClose: () => void;
}

export default function TranscriptView({
  student, overallCgpa, totalCreditsCompleted, honoursTargetCredits, onClose
}: TranscriptViewProps) {
  const uploadedSemesters = (student.semesters || []).filter((s) => s.isVerified && !s.isRejected);
  const latestSemester = uploadedSemesters[uploadedSemesters.length - 1];

  return (
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
          onClick={onClose}
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
          <p><strong className="text-slate-500">Student Name:</strong> {student.name}</p>
          <p><strong className="text-slate-500">Register Number:</strong> {student.registerNo}</p>
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
          <p>System Generated Report — Verification Token: {student.id.substring(0, 8).toUpperCase()}</p>
        </div>
        <div className="text-center text-xs">
          <div className="w-40 border-b border-slate-900 mb-2"></div>
          <p className="font-bold">Head of Department (BCA)</p>
          <p className="text-slate-500">Safi Institute of Advanced Study</p>
        </div>
      </div>
    </div>
  );
}
