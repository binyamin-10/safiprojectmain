// ─── Excel Export Utilities ───────────────────────────────────────────────────
// DRY: Previously ~360 lines of near-identical code inlined in page.tsx.
// Now consolidated into two clean, parameterised async functions.

import { downloadBlob, getApcRemark } from "@/lib/utils";
import type { AnalysisStudent, AllSemestersRow, AnalysisSubjectColumn } from "@/types/admin";

// ─── Shared: Apply remark color to an ExcelJS cell ─────────────────────────
function applyRemarkColor(cell: any, remark: string): void {
  const colors: Record<string, string> = {
    Eligible: "FF059669",
    "Single Condonation": "FFD97706",
    "Double Condonation": "FFE07A5F",
    "Sem Out": "FFDC2626",
  };
  if (colors[remark]) {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: colors[remark] } };
  }
}

// ─── Shared: Style header row cells ──────────────────────────────────────────
function styleHeaderRow(row: any, bgArgb: string, borderArgb: string): void {
  row.eachCell((cell: any) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "medium", color: { argb: borderArgb } },
      bottom: { style: "medium", color: { argb: borderArgb } },
      left: { style: "thin", color: { argb: "FF475569" } },
      right: { style: "thin", color: { argb: "FF475569" } },
    };
  });
}

// ─── Shared: Style data row cells ────────────────────────────────────────────
function styleDataRow(row: any): void {
  row.height = 20;
  row.eachCell((cell: any, colNumber: number) => {
    cell.font = { name: "Arial", size: 10 };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
    cell.alignment =
      colNumber === 3
        ? { vertical: "middle", horizontal: "left" }
        : { vertical: "middle", horizontal: "center" };
    applyRemarkColor(cell, String(cell.value));
  });
}

// ─── Shared: Auto-fit column widths (skip title rows) ───────────────────────
function autoFitColumns(worksheet: any): void {
  worksheet.columns.forEach((column: any) => {
    let maxLen = 0;
    column.eachCell &&
      column.eachCell({ includeEmpty: false }, (cell: any) => {
        if (Number(cell.row) > 5) {
          const len = cell.value ? String(cell.value).length : 0;
          if (len > maxLen) maxLen = len;
        }
      });
    column.width = Math.max(maxLen + 4, 11);
  });
  worksheet.getColumn(2).width = 18; // Reg No
  worksheet.getColumn(3).width = 28; // Name
}

// ─── Shared: Write title block (rows 2–4) ────────────────────────────────────
function writeTitleBlock(worksheet: any, batch: string, description: string): void {
  worksheet.addRow([]); // Row 1 – blank
  const titleCell = worksheet.getCell("B2");
  titleCell.value = "SAFI INSTITUTE OF ADVANCED STUDY (AUTONOMOUS)";
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF1E293B" } };

  const batchCell = worksheet.getCell("B3");
  batchCell.value = `Batch: ${batch || "BCA2024-28"}`;
  batchCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF475569" } };

  const descCell = worksheet.getCell("B4");
  descCell.value = description;
  descCell.font = { name: "Arial", size: 11, italic: true, color: { argb: "FF64748B" } };

  worksheet.addRow([]); // Row 5 – spacer
  worksheet.addRow([]); // Row 6 – spacer
}

// ─────────────────────────────────────────────────────────────────────────────

export interface SingleSemesterExportParams {
  semesterNumber: number;
  batch: string;
  students: AnalysisStudent[];
  subjects: AnalysisSubjectColumn[];
}

/** Export a single semester's result analysis to an .xlsx file */
export async function exportSingleSemesterExcel({
  semesterNumber,
  batch,
  students,
  subjects,
}: SingleSemesterExportParams): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`Semester ${semesterNumber} Analysis`);

  writeTitleBlock(
    worksheet,
    batch,
    `Semester ${semesterNumber} Result & Attendance Analysis Report`
  );

  // Headers
  const headers = ["Roll No", "Register No", "Name", ...subjects.map((s) => s.code), "Grade", "SGPA", "APC", "Remarks"];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;
  styleHeaderRow(headerRow, "FF0F172A", "FF020617");

  // Data rows
  students.forEach(({ student, semester }) => {
    const rollNo = student.registerNo?.slice(-2) ?? "—";
    const gradeMap = new Map(semester.subjects?.map((s) => [s.subjectCode, s.grade]) ?? []);

    const rowValues: any[] = [rollNo, student.registerNo, student.name];
    subjects.forEach((sub) => {
      const grade = sub.mergedCodes
        ? sub.mergedCodes.reduce<string | undefined>((found, code) => found || gradeMap.get(code), undefined)
        : gradeMap.get(sub.code);
      rowValues.push(grade ?? "—");
    });

    const apcNum = semester.apc ? parseFloat(semester.apc) : null;
    const remark = getApcRemark(semester.apc);
    rowValues.push(
      semester.overallGrade,
      Number(semester.sgpa.toFixed(3)),
      apcNum !== null ? `${apcNum.toFixed(2)}%` : "—",
      remark
    );

    const row = worksheet.addRow(rowValues);
    styleDataRow(row);
  });

  autoFitColumns(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `Result_Analysis_${batch || "Report"}_Semester_${semesterNumber}.xlsx`
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export interface AllSemestersExportParams {
  batch: string;
  data: AllSemestersRow[];
  maxSem: number;
}

/** Export all semesters overview to an .xlsx file */
export async function exportAllSemestersExcel({
  batch,
  data,
  maxSem,
}: AllSemestersExportParams): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("All Semesters Analysis");

  writeTitleBlock(worksheet, batch, "All Semester Result & Attendance Analysis Report");

  // Headers
  const headers = ["Roll No", "Register No", "Name"];
  for (let sem = 1; sem <= maxSem; sem++) headers.push(`Sem ${sem} SGPA`);
  headers.push("Avg SGPA (CGPA)", "Percentage", "Rank");
  for (let sem = 1; sem <= maxSem; sem++) headers.push(`Sem ${sem} APC`, `Sem ${sem} Remarks`);

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;
  styleHeaderRow(headerRow, "FF312E81", "FF1E1B4B");

  // Data rows
  data.forEach((row) => {
    const rollNo = row.student.registerNo?.slice(-2) ?? "—";
    const rowValues: any[] = [rollNo, row.student.registerNo, row.student.name];

    for (let sem = 1; sem <= maxSem; sem++) {
      rowValues.push(row.rowSgpas.has(sem) ? Number(row.rowSgpas.get(sem)!.toFixed(3)) : "—");
    }
    rowValues.push(Number(row.cgpa.toFixed(3)), `${row.percentage.toFixed(2)}%`, Number(row.rank));

    for (let sem = 1; sem <= maxSem; sem++) {
      const apcRaw = row.rowApc.get(sem);
      const apcNum = apcRaw ? parseFloat(apcRaw) : null;
      rowValues.push(
        apcNum !== null ? `${apcNum.toFixed(2)}%` : "—",
        getApcRemark(apcRaw)
      );
    }

    const excelRow = worksheet.addRow(rowValues);
    styleDataRow(excelRow);
  });

  autoFitColumns(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `Result_Analysis_${batch || "Report"}_All_Semesters.xlsx`
  );
}
