// ─── Shared Utilities ─────────────────────────────────────────────────────────
// DRY: These helpers were previously inlined 3-6 times across admin + student portals.

/** Sort roll numbers numerically by trailing digits (e.g. BCA24007 < BCA24028) */
export const compareRollNo = (aStr: string, bStr: string): number => {
  const aMatch = aStr.match(/\d+$/);
  const bMatch = bStr.match(/\d+$/);
  if (aMatch && bMatch) {
    return parseInt(aMatch[0], 10) - parseInt(bMatch[0], 10);
  }
  return aStr.localeCompare(bStr);
};

/** Convert APC attendance percentage to eligibility remark string */
export const getApcRemark = (apcRaw: string | null | undefined): string => {
  if (!apcRaw) return "—";
  const apcNum = parseFloat(apcRaw);
  if (isNaN(apcNum)) return "—";
  if (apcNum >= 75) return "Eligible";
  if (apcNum >= 65) return "Single Condonation";
  if (apcNum >= 55) return "Double Condonation";
  return "Sem Out";
};

/** Calicut University grade point table */
export const GRADE_POINTS: Record<string, number> = {
  O: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, P: 4, F: 0,
};

/** Compute overall grade letter from SGPA value */
export const computeOverallGrade = (sgpa: number, hasFailed: boolean): string => {
  if (hasFailed) return "F";
  if (sgpa >= 9.5) return "O";
  if (sgpa >= 8.5) return "A+";
  if (sgpa >= 7.5) return "A";
  if (sgpa >= 6.5) return "B+";
  if (sgpa >= 5.5) return "B";
  if (sgpa >= 4.5) return "C";
  if (sgpa >= 4.0) return "P";
  return "F";
};

/** Trigger a client-side file download from a Blob/Buffer */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
