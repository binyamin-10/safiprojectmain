// NOTE: No curriculum import needed — subjects are extracted purely from the marksheet PDF/image.

export interface ExtractedSubject {
  code: string;
  name: string;
  grade: string;
  gradePoint: number;
  credits: number;
  creditPoint: number;
  status: "Pass" | "Fail" | "Withheld" | "Absent";
  ocrConfidence: "High" | "Medium" | "Low";
}

export interface OCRResult {
  studentName: string;
  registerNo: string;
  semester?: number;
  programme?: string;
  examMonth?: string;
  subjects: ExtractedSubject[];
  sgpa: number;
  overallGrade: string;
  status: "Pass" | "Fail";
  rawText: string;
}

// ─── Grade Point Table (Calicut University) ────────────────────────────────────
const GRADE_POINTS: Record<string, number> = {
  O: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, P: 4, F: 0,
};

function getGradePoint(grade: string): number {
  return GRADE_POINTS[grade.toUpperCase().trim()] ?? 0;
}

// ─── Calicut University Marksheet PDF Row Parser ───────────────────────────────
//
// The marksheet PDF produces text like:
//   "1 ENG1FA101(2) - ENGLISH LANGUAGE SKILLS\nFOR SCIENCES B+ 7.000 3.0 21 P"
//   "2\nBCA1CJ101 - FUNDAMENTALS OF\nCOMPUTERS AND COMPUTATIONAL\nTHINKING\nA+ 9.000 4.0 36 P"
//
// Strategy:
//   1. Filter out all header/footer/column-label lines.
//   2. Accumulate remaining lines into chunks, flushing each time a line ends with
//      the Calicut data-suffix pattern: GRADE  GP(decimal)  C(decimal)  CP(int)  RESULT
//   3. Parse code, full subject name, grade, credits, credit points from each chunk.

// Matches a Calicut University course code: e.g. BCA1CJ101, ENG1FA101(2), PHY1FM105
const CODE_RE = /([A-Z]{2,5}\d[A-Z]{0,3}\d{2,3}(?:\(\d+\))?)/;
const CODE_AT_START_RE = /^([A-Z]{2,5}\d[A-Z]{0,3}\d{2,3}(?:\(\d+\))?)(?:\b|\s*-)/;

// Lines that are structural headers/footers and NOT subject data
const SKIP_RE =
  /^(s\.?no\b|grade\s+obtained|grade\s*point|credit\s*\(|credit\s*point|sgpa\s*:|wh\s*:|ab\s*:|controller|mansoor|--\s*\d|safi institute|\(autonomous\)|affiliated to|bachelor of|master of|ug\/pg|fyugp|registration no|name\s*:|first semester|second semester|third semester|fourth semester|fifth semester|sixth semester|seventh semester|eighth semester|^bca$|^mca$|^bcom$|^bsc$|^ba$)/i;

// Lines that are ONLY a serial number
const SERIAL_ONLY_RE = /^\d{1,2}$/;

// Lone column-header words/phrases
const COLHDR_RE =
  /^(obtained|point(\s*\([gcGC](?:xg|XG)?\))?|credit|result|\(g\)|\(c\)|\(cxg\)|grade(\s+obtained)?|subject|examination|credit\s*point)$/i;

// Semester/exam date header line  e.g. "First Semester UG/PG Examination, November 2024"
const EXAMDATE_RE =
  /\bexamination\b.*\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i;

// ─── Data-row suffix: GRADE  GP  CREDITS  CP  RESULT ──────────────────────────
// Handles both decimal (7.000) and integer (7) grade point formats,
// tab or space delimited, as different PDF generators use different formats.
// e.g.  "B+\t7\t3\t21\tP"   or   "O 10.000 3.0 30 P"
const DATA_SUFFIX_RE =
  /\b(O|A\+|A|B\+|B|C|P|F)[\s\t]+(\d+(?:\.\d+)?)[\s\t]+(\d+(?:\.\d+)?)[\s\t]+(\d+)[\s\t]+(P|F|WH|AB)\s*$/i;

interface ParsedRow {
  code: string;
  /** Full subject name as it appears in the PDF (code stripped from front) */
  nameFromPDF: string;
  grade: string;
  gradePoint: number;
  credits: number;
  creditPoint: number;
  result: string;
}

function parsePDFRows(rawText: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = rawText
    .split("\n")
    .map((l) => l.replace(/\t+/g, " ").trim())
    .filter((l) => l.length > 0);

  let chunk: string[] = [];

  const flushChunk = () => {
    if (!chunk.length) return;
    // Join lines and normalize all tabs/multiple spaces to single space
    const chunkText = chunk.join(" ").replace(/\t+/g, " ").replace(/\s{2,}/g, " ").trim();

    const suffixMatch = chunkText.match(DATA_SUFFIX_RE);
    if (!suffixMatch) {
      chunk = [];
      return;
    }

    const grade      = suffixMatch[1].toUpperCase();
    const gradePoint = parseFloat(suffixMatch[2]);
    const credits    = parseFloat(suffixMatch[3]);
    const creditPoint = parseInt(suffixMatch[4]);
    const result     = suffixMatch[5].toUpperCase();

    // Everything before the suffix
    const subjectPart = chunkText
      .substring(0, chunkText.length - suffixMatch[0].length)
      .trim();

    // Strip leading serial number e.g. "1 " or "12 " (with space or tab after)
    const withoutSerial = subjectPart.replace(/^\d{1,2}[\s\t]+/, "").trim();

    // Extract course code from the beginning of the subject text
    const codeMatch = withoutSerial.match(CODE_AT_START_RE);
    const code = codeMatch ? codeMatch[1] : "";

    if (!code) {
      // No recognisable code — skip (might be a continuation artifact)
      chunk = [];
      return;
    }

    // Subject name is everything after "CODE - " or "CODE "
    const afterCode = withoutSerial.substring(code.length).trim();
    const nameFromPDF = afterCode.startsWith("- ")
      ? afterCode.substring(2).trim()
      : afterCode;

    rows.push({ code, nameFromPDF, grade, gradePoint, credits, creditPoint, result });
    chunk = [];
  };

  // Detects a line that starts a new subject row (optional serial number + course code)
  const CODE_LINE_RE = /^(?:\d{1,2}\s+)?[A-Z]{2,5}\d[A-Z]{0,3}\d{2,3}(?:\(\d+\))?\s*[-\s]/;

  for (const line of lines) {
    // ── Skip structural / header lines ──
    if (SKIP_RE.test(line)) continue;
    if (SERIAL_ONLY_RE.test(line)) continue;
    if (COLHDR_RE.test(line)) continue;
    if (EXAMDATE_RE.test(line)) continue;

    // ── If this line starts a new subject, flush whatever chunk we have ──
    // This prevents header remnants from contaminating the first subject's chunk
    if (CODE_LINE_RE.test(line) && chunk.length > 0) {
      flushChunk();
    }

    // ── Accumulate and flush on data-suffix ──
    const suffixTest = DATA_SUFFIX_RE.test(line);
    chunk.push(line);
    if (suffixTest) flushChunk();
  }

  // Flush any remaining partial chunk
  flushChunk();

  return rows;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Extracts ALL subjects, codes, grades, and credits directly from the uploaded
 * marksheet. Does NOT rely on any pre-defined curriculum — works for any batch.
 *
 * Uses dynamic imports so Turbopack does not bundle native Node modules.
 */
export async function processMarksheetOCR(
  imageBuffer: Buffer,
  semesterNumber: number
): Promise<OCRResult> {
  let text = "";

  // ── Step 1: Extract raw text from file ──────────────────────────────────────
  const isPDF = imageBuffer.slice(0, 4).toString() === "%PDF";

  if (isPDF) {
    try {
      console.log("[OCR] PDF detected — extracting text directly...");
      // Using unpdf (modern pdf.js wrapper) to prevent Vercel canvas crashes while preserving accurate text format
      const { extractText } = await import("unpdf");
      const { text: extracted } = await extractText(imageBuffer);
      text = typeof extracted === 'string' ? extracted : (extracted?.join?.('\n') || "");

      console.log("[OCR] Raw text (first 1000 chars):", JSON.stringify(text.substring(0, 1000)));
      console.log("[OCR] Raw text length:", text.length);

      // Check if this is an image-only PDF (no selectable text layer)
      if (text.trim().length < 50 || (!text.toLowerCase().includes("grade") && !text.toLowerCase().includes("sgpa"))) {
        throw new Error("This PDF appears to be a scanned image without a text layer. Please convert it to a PNG/JPG image and upload it again so the OCR engine can read it.");
      }
    } catch (err: any) {
      console.error("[OCR] PDF extraction error:", err);
      if (err.message?.includes("scanned image")) throw err;
      text = "";
    }
  } else {
    const hex4 = imageBuffer.slice(0, 4).toString("hex");
    const isPng  = hex4 === "89504e47";
    const isJpg  = hex4.startsWith("ffd8ff");
    const isWebp =
      imageBuffer.slice(0, 4).toString() === "RIFF" &&
      imageBuffer.slice(8, 12).toString() === "WEBP";

    if (isPng || isJpg || isWebp) {
      try {
        console.log("[OCR] Image detected — starting Tesseract...");
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        const { data: { text: rawText } } = await worker.recognize(imageBuffer);
        await worker.terminate();
        text = rawText;
      } catch (err) {
        console.error("[OCR] Tesseract error:", err);
        text = "";
      }
    } else {
      console.warn("[OCR] Unsupported file format.");
    }
  }

  // ── Step 2: Parse student metadata from the raw text ────────────────────────
  let studentName = "";
  let registerNo  = "";
  let programme   = "";
  let examMonth   = "";

  const nameMatch = text.match(/Name\s*:\s*([A-Za-z\s]{3,60}?)(?:\n|Registration|Bachelor|Master|$)/);
  if (nameMatch?.[1]) studentName = nameMatch[1].trim();

  const regMatch = text.match(/Registration\s*No\s*:\s*([A-Z0-9]{6,20})/i);
  if (regMatch?.[1]) registerNo = regMatch[1].trim();

  const progMatch = text.match(/^(Bachelor|Master|B\.?\s*[A-Z]+|M\.?\s*[A-Z]+[^\n]*)/im);
  if (progMatch?.[1]) programme = progMatch[1].trim();

  const examDateMatch = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i
  );
  if (examDateMatch?.[0]) examMonth = examDateMatch[0];

  // Declared SGPA and grade from the PDF footer
  const sgpaFromPDF = (() => {
    const m = text.match(/SGPA\s*:\s*([\d.]+)/i);
    return m ? parseFloat(m[1]) : null;
  })();

  const overallGradeFromPDF = (() => {
    // Match "Grade : B+" and capture the trailing plus if present by using negative lookahead instead of word boundary
    const m = text.match(/\bGrade\s*:\s*(O|A\+|A|B\+|B|C|P|F)(?![A-Z0-9])/i);
    return m ? m[1].toUpperCase() : null;
  })();

  // ── Step 3: Parse all subject rows from the PDF text ────────────────────────
  const parsedRows = parsePDFRows(text);

  if (parsedRows.length === 0) {
    throw new Error("No subjects could be extracted from this document. Please ensure it is a valid marksheet or upload a clearer Image (PNG/JPG) instead of a scanned PDF.");
  }

  console.log(
    `[OCR] Parsed ${parsedRows.length} subjects:`,
    parsedRows.map((r) => `${r.code}=${r.grade}`).join(", ")
  );

  // ── Step 4: Build ExtractedSubject list directly from parsed rows ─────────
  // No curriculum lookup — every field comes from the actual PDF.
  let totalCredits     = 0;
  let totalCreditPoints = 0;
  let hasFailedSubject = false;

  const extractedSubjects: ExtractedSubject[] = parsedRows.map((row) => {
    const isPass = row.result !== "F" && row.result !== "WH" && row.result !== "AB";
    const status: ExtractedSubject["status"] =
      row.result === "WH" ? "Withheld" :
      row.result === "AB" ? "Absent" :
      isPass ? "Pass" : "Fail";

    if (!isPass) hasFailedSubject = true;

    totalCredits      += row.credits;
    totalCreditPoints += row.creditPoint;

    return {
      code:         row.code,
      name:         row.nameFromPDF,
      grade:        row.grade,
      gradePoint:   row.gradePoint,
      credits:      row.credits,
      creditPoint:  row.creditPoint,
      status,
      ocrConfidence: "High",
    };
  });

  // ── Step 5: Compute SGPA ─────────────────────────────────────────────────
  const computedSGPA =
    totalCredits > 0
      ? parseFloat((totalCreditPoints / totalCredits).toFixed(3))
      : 0;

  // Trust the PDF-declared SGPA if it's within 0.01 of computed (rounding differences)
  const sgpa =
    sgpaFromPDF !== null && Math.abs(sgpaFromPDF - computedSGPA) < 0.02
      ? sgpaFromPDF
      : computedSGPA;

  // ── Step 6: Determine overall grade ──────────────────────────────────────
  let overallGrade = overallGradeFromPDF || "F";
  if (!overallGradeFromPDF && !hasFailedSubject) {
    if      (sgpa >= 9.5) overallGrade = "O";
    else if (sgpa >= 8.5) overallGrade = "A+";
    else if (sgpa >= 7.5) overallGrade = "A";
    else if (sgpa >= 6.5) overallGrade = "B+";
    else if (sgpa >= 5.5) overallGrade = "B";
    else if (sgpa >= 4.5) overallGrade = "C";
    else if (sgpa >= 4.0) overallGrade = "P";
    else                  overallGrade = "F";
  }

  return {
    studentName:  studentName || "Unknown",
    registerNo:   registerNo  || "Unknown",
    semester:     semesterNumber,
    programme,
    examMonth,
    subjects:     extractedSubjects,
    sgpa,
    overallGrade,
    status:       hasFailedSubject ? "Fail" : "Pass",
    rawText:      text,
  };
}
