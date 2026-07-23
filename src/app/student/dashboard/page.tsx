"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, LayoutDashboard, BookOpen, Briefcase } from "lucide-react";

import { useStudentData } from "@/hooks/useStudentData";
import type { StudentTabType } from "@/types/student";
import ErrorBanner from "@/components/ui/ErrorBanner";
import StudentHeader from "@/components/student/StudentHeader";
import DashboardTab from "@/components/student/DashboardTab";
import SemestersTab from "@/components/student/SemestersTab";
import InternshipsTab from "@/components/student/InternshipsTab";
import OcrVerifyModal from "@/components/student/OcrVerifyModal";
import TranscriptView from "@/components/student/TranscriptView";

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as any;
  const registerNo = user?.registerNo || "";
  const studentName = user?.name || "";

  const [activeTab, setActiveTab] = useState<StudentTabType>("dashboard");

  // Load all student state & handlers via our custom hook
  const data = useStudentData(registerNo, studentName);

  // Auth Guard & Initial Fetch
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && user) {
      if (user.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else if (registerNo) {
        data.fetchStudentData();
      }
    }
  }, [status, user, router, registerNo, data.fetchStudentData]);

  if (status === "loading" || (data.loading && !data.student)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="mt-4 text-slate-400 font-medium">Loading Student Workspace...</p>
      </div>
    );
  }

  if (!data.student) return null;

  // Derived Metrics
  const uploadedSemesters = data.student.semesters || [];
  const latestSemester = uploadedSemesters[uploadedSemesters.length - 1];
  const overallCgpa = latestSemester ? latestSemester.cgpa : 0;
  
  let totalCreditsCompleted = 0;
  uploadedSemesters.forEach((sem) => {
    sem.subjects.forEach((sub) => {
      if (sub.grade !== "F") totalCreditsCompleted += sub.credits;
    });
  });

  const chartData = uploadedSemesters.map((sem) => ({
    name: `Sem ${sem.semesterNumber}`,
    SGPA: sem.sgpa,
    CGPA: sem.cgpa,
  }));

  const HONOURS_TARGET = 160;
  const creditCompletionPercent = Math.min(Math.round((totalCreditsCompleted / HONOURS_TARGET) * 100), 100);

  return (
    <div className="min-h-screen pb-32 text-slate-100 relative bg-slate-950/20">
      <StudentHeader
        isPrintView={data.isPrintView}
        onTogglePrintView={() => data.setIsPrintView(!data.isPrintView)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <ErrorBanner message={data.error} onDismiss={() => data.setError("")} />

        {data.isPrintView ? (
          <TranscriptView
            student={data.student}
            overallCgpa={overallCgpa}
            totalCreditsCompleted={totalCreditsCompleted}
            honoursTargetCredits={HONOURS_TARGET}
            onClose={() => data.setIsPrintView(false)}
          />
        ) : (
          <div className="space-y-6 print:hidden">
            {activeTab === "dashboard" && (
              <DashboardTab
                student={data.student}
                overallCgpa={overallCgpa}
                totalCreditsCompleted={totalCreditsCompleted}
                creditCompletionPercent={creditCompletionPercent}
                chartData={chartData}
              />
            )}
            
            {activeTab === "semesters" && (
              <SemestersTab
                uploadedSemesters={uploadedSemesters}
                uploadSemester={data.uploadSemester}
                uploadFile={data.uploadFile}
                scanning={data.scanning}
                expandedSemesters={data.expandedSemesters}
                onSemesterChange={data.setUploadSemester}
                onFileSelect={data.setUploadFile}
                onSubmit={data.triggerUpload}
                onToggleExpand={data.toggleExpand}
              />
            )}

            {activeTab === "internships" && (
              <InternshipsTab
                internships={data.student.internships || []}
                internshipCourse={data.internshipCourse}
                internshipHours={data.internshipHours}
                internshipFile={data.internshipFile}
                uploadingInternship={data.uploadingInternship}
                onCourseChange={data.setInternshipCourse}
                onHoursChange={data.setInternshipHours}
                onFileSelect={data.setInternshipFile}
                onSubmit={data.submitInternship}
              />
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      {!data.isPrintView && (
        <div className="fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200/80 rounded-t-3xl py-3.5 pb-5 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-40 print:hidden">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center gap-1.5 py-1 px-4 transition-all ${activeTab === "dashboard" ? "text-indigo-600 scale-105" : "text-[#5e7e72] hover:text-slate-800"}`}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-wider">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab("semesters")}
            className={`flex flex-col items-center gap-1.5 py-1 px-4 transition-all ${activeTab === "semesters" ? "text-[#0D7F58] scale-105" : "text-[#5e7e72] hover:text-[#0D7F58]"}`}
          >
            <BookOpen className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-wider">Semesters</span>
          </button>
          <button
            onClick={() => setActiveTab("internships")}
            className={`flex flex-col items-center gap-1.5 py-1 px-4 transition-all ${activeTab === "internships" ? "text-[#0D7F58] scale-105" : "text-[#5e7e72] hover:text-[#0D7F58]"}`}
          >
            <Briefcase className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-wider">Internships</span>
          </button>
        </div>
      )}

      {/* OCR Verification Modal */}
      {data.isVerifying && data.ocrData && (
        <OcrVerifyModal
          ocrData={data.ocrData}
          showGrievanceInput={data.showGrievanceInput}
          grievanceText={data.grievanceText}
          onClose={() => {
            data.setIsVerifying(false);
            data.setOcrData(null);
            data.setShowGrievanceInput(false);
            data.setGrievanceText("");
          }}
          onToggleGrievance={() => {
            data.setShowGrievanceInput(!data.showGrievanceInput);
            if (!data.showGrievanceInput) data.setGrievanceText("");
          }}
          onGrievanceTextChange={data.setGrievanceText}
          onGradeChange={data.handleGradeChange}
          onSave={data.saveVerifiedSemester}
        />
      )}
    </div>
  );
}
