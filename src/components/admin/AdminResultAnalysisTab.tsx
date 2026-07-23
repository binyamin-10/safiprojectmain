"use client";

import { Fragment } from "react";
import { Table2, Edit2, Download, ChevronDown, Eye } from "lucide-react";
import type { Student } from "@/types/admin";

interface AdminResultAnalysisTabProps {
  effectiveSemester: number | 'ALL';
  setEffectiveSemester: (sem: number | 'ALL') => void;
  availableSemesters: number[];
  isEditingApc: boolean;
  setIsEditingApc: (v: boolean) => void;
  analysisStudents: any[];
  allSemestersData: any;
  sortedAnalysisStudents: any[];
  analysisSubjects: any[];
  editedApcValues: Record<string, string>;
  setEditedApcValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  editedSubjectGrades: Record<string, string>;
  setEditedSubjectGrades: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSort: (field: 'rollNo' | 'name' | 'rank') => void;
  renderSortIndicator: (field: string) => React.ReactNode;
  setSelectedStudent: (s: Student) => void;
  setIsViewingTranscript: (v: boolean) => void;
  handleExportExcel: () => void;
  handleExportSingleSemesterExcel: () => void;
  handleBulkUpdateApc: () => void;
  loading: boolean;
}

export default function AdminResultAnalysisTab({
  effectiveSemester, setEffectiveSemester, availableSemesters, isEditingApc, setIsEditingApc,
  analysisStudents, allSemestersData, sortedAnalysisStudents, analysisSubjects,
  editedApcValues, setEditedApcValues, editedSubjectGrades, setEditedSubjectGrades,
  handleSort, renderSortIndicator, setSelectedStudent, setIsViewingTranscript,
  handleExportExcel, handleExportSingleSemesterExcel, handleBulkUpdateApc, loading
}: AdminResultAnalysisTabProps) {
  return (
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
                  semester.subjects.forEach((sub: any) => {
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
                setEffectiveSemester(val === 'ALL' ? 'ALL' : Number(val));
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
                  <th onClick={() => handleSort('rollNo')} className="p-2.5 text-center w-12 cursor-pointer select-none hover:bg-slate-800/60 transition-colors">
                    Roll No{renderSortIndicator('rollNo')}
                  </th>
                  <th onClick={() => handleSort('rollNo')} className="p-2.5 min-w-[120px] cursor-pointer select-none hover:bg-slate-800/60 transition-colors">
                    Reg No{renderSortIndicator('rollNo')}
                  </th>
                  <th onClick={() => handleSort('name')} className="p-2.5 min-w-[150px] cursor-pointer select-none hover:bg-slate-800/60 transition-colors">
                    Name{renderSortIndicator('name')}
                  </th>
                  {Array.from({ length: allSemestersData.maxSem }, (_, i) => i + 1).map(sem => (
                    <th key={`sgpa-hdr-${sem}`} className="p-2.5 text-center min-w-[70px]">Sem {sem}<br/>SGPA</th>
                  ))}
                  <th onClick={() => handleSort('rank')} className="p-2.5 text-center min-w-[72px] text-emerald-400 cursor-pointer select-none hover:bg-slate-800/60 transition-colors">
                    Avg SGPA<br/>(CGPA){renderSortIndicator('rank')}
                  </th>
                  <th onClick={() => handleSort('rank')} className="p-2.5 text-center min-w-[72px] cursor-pointer select-none hover:bg-slate-800/60 transition-colors">
                    Percentage{renderSortIndicator('rank')}
                  </th>
                  <th onClick={() => handleSort('rank')} className="p-2.5 text-center w-10 cursor-pointer select-none hover:bg-slate-800/60 transition-colors">
                    Rank{renderSortIndicator('rank')}
                  </th>
                  {Array.from({ length: allSemestersData.maxSem }, (_, i) => i + 1).map(sem => (
                    <Fragment key={`sem-group-${sem}`}>
                      <th key={`apc-hdr-${sem}`} className="p-2.5 text-center min-w-[60px] text-sky-400">Sem {sem}<br/>APC</th>
                      <th key={`rmk-hdr-${sem}`} className="p-2.5 text-center min-w-[110px] text-amber-400">Sem {sem}<br/>Remarks</th>
                    </Fragment>
                  ))}
                  <th className="p-2.5 text-center w-14"></th>
                </tr>
              </thead>
              <tbody>
                {allSemestersData.data.map((row: any) => {
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
                          <Fragment key={`sem-rmk-group-${sem}`}>
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
      ) : sortedAnalysisStudents.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs spreadsheet-table">
            <thead>
              <tr className="bg-slate-900/60 text-[10px] text-slate-500 uppercase font-bold border-b-2 border-slate-700">
                <th onClick={() => handleSort('rollNo')} className="p-2.5 text-center w-12 cursor-pointer select-none hover:bg-slate-800/60 transition-colors">
                  Roll No{renderSortIndicator('rollNo')}
                </th>
                <th onClick={() => handleSort('rollNo')} className="p-2.5 min-w-[120px] cursor-pointer select-none hover:bg-slate-800/60 transition-colors">
                  Reg No{renderSortIndicator('rollNo')}
                </th>
                <th onClick={() => handleSort('name')} className="p-2.5 min-w-[150px] cursor-pointer select-none hover:bg-slate-800/60 transition-colors">
                  Name{renderSortIndicator('name')}
                </th>
                {analysisSubjects.map(sub => (
                  <th key={sub.code} className="p-2.5 text-center min-w-[70px]" title={sub.mergedNames ? sub.mergedNames.join(', ') : (sub.name.split(' - ')[1] || sub.name)}>
                    {sub.code}
                  </th>
                ))}
                <th className="p-2.5 text-center min-w-[72px]">Grade</th>
                <th onClick={() => handleSort('rank')} className="p-2.5 text-center min-w-[72px] cursor-pointer select-none hover:bg-slate-800/60 transition-colors">
                  SGPA{renderSortIndicator('rank')}
                </th>
                <th className="p-2.5 text-center min-w-[120px]" title="Attendance, Progress, and Conduct">APC</th>
                <th className="p-2.5 text-center w-14"></th>
              </tr>
            </thead>
            <tbody>
              {sortedAnalysisStudents.map(({ student, semester }, idx) => {
                const rollNo = student.registerNo ? student.registerNo.slice(-2) : "—";
                return (
                  <tr key={student.id} className="border-b border-slate-800/30 last:border-0 hover:bg-slate-800/20 transition-colors">
                    <td className="p-2.5 text-center font-bold text-slate-300">{rollNo}</td>
                    <td className="p-2.5 font-semibold text-indigo-400 whitespace-nowrap">{student.registerNo}</td>
                    <td className="p-2.5 text-slate-200 font-medium">{student.name}</td>
                    {analysisSubjects.map(sub => {
                      const matchedSubject = semester.subjects.find((s: any) => 
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
                {loading && <span className="animate-spin text-white">...</span>}
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
  );
}
