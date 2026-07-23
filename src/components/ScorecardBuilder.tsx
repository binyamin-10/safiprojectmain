"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  GraduationCap,
  Download,
  Users,
  Award,
  BadgeCheck,
  Target,
  Trophy,
  TrendingUp,
  CreditCard,
  Contact,
  IdCard,
  BarChart3,
  Building,
  BookOpen,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

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

export interface Student {
  id: string;
  registerNo: string;
  name: string;
  batch?: string | null;
  createdAt: string;
  semesters: SemesterReport[];
  internships?: any[];
}

interface ScorecardBuilderProps {
  students: Student[];
  availableBatches?: string[];
  currentBatch?: string;
  onBatchChange?: (batch: string) => void;
}

interface ProcessedStudent {
  id: string;
  name: string;
  registerNo: string;
  batch: string;
  rank: number;
  maxSem: number;
  sgpa: (number | null)[];
  attendance: (number | null)[];
  condonation: (string | null)[];
  averageSgpa: number | null;
  averageAttendance: number | null;
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export default function ScorecardBuilder({
  students,
  availableBatches = [],
  currentBatch = "All",
  onBatchChange,
}: ScorecardBuilderProps) {
  // Header Settings State
  const [instituteName, setInstituteName] = useState("SAFI INSTITUTE OF\nADVANCED STUDY\n(AUTONOMOUS)");
  const [departmentName, setDepartmentName] = useState("Department of Computer Applications");
  const [programTitle, setProgramTitle] = useState(
    `BCA Professional Progress Dashboard | Batch ${currentBatch !== "All" ? currentBatch : "2024-28"}`
  );
  const [contactLine, setContactLine] = useState(
    "Vazhayur East P.O. Malappuram dt. Kerala, Pin: 673 633 | www.sias.edu.in"
  );

  // Filters, Pagination & State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatch, setSelectedBatch] = useState(currentBatch);
  const [pageSize, setPageSize] = useState<number>(0); // Default 0 (All cards rendered continuously)

  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [exportingStudent, setExportingStudent] = useState<ProcessedStudent | null>(null);

  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const offscreenExportRef = useRef<HTMLDivElement>(null);

  // Keep programTitle updated when batch changes
  const handleBatchSelect = (batch: string) => {
    setSelectedBatch(batch);
    if (onBatchChange) onBatchChange(batch);
    setProgramTitle(`BCA Professional Progress Dashboard | Batch ${batch !== "All" ? batch : "2024-28"}`);
  };

  // Process raw DB students into Scorecard format dynamically
  const processedStudents: ProcessedStudent[] = useMemo(() => {
    let filtered = students.filter((s) => {
      const matchBatch = selectedBatch === "All" || s.batch === selectedBatch;
      const matchSearch =
        searchQuery.trim() === "" ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.registerNo.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBatch && matchSearch;
    });

    const list = filtered.map((st) => {
      const semReports = [...(st.semesters || [])]
        .filter((r) => r.isVerified && !r.isRejected)
        .sort((a, b) => a.semesterNumber - b.semesterNumber);

      const maxReportSem = semReports.reduce((max, r) => Math.max(max, r.semesterNumber || 0), 0);
      const studentMaxSem = Math.max(4, Math.min(8, maxReportSem));

      const sgpaArr: (number | null)[] = Array(studentMaxSem).fill(null);
      const attnArr: (number | null)[] = Array(studentMaxSem).fill(null);
      const condArr: (string | null)[] = Array(studentMaxSem).fill(null);

      semReports.forEach((report) => {
        const semIdx = report.semesterNumber - 1;
        if (semIdx >= 0 && semIdx < studentMaxSem) {
          sgpaArr[semIdx] = typeof report.sgpa === "number" && !isNaN(report.sgpa) ? report.sgpa : null;

          if (report.apc) {
            const rawStr = String(report.apc);
            const numMatch = rawStr.match(/\d+(?:\.\d+)?/);
            if (numMatch) {
              const parsedApc = parseFloat(numMatch[0]);
              if (!isNaN(parsedApc) && parsedApc <= 100) {
                attnArr[semIdx] = parsedApc;
                if (parsedApc >= 75) condArr[semIdx] = "Eligible";
                else if (parsedApc >= 65) condArr[semIdx] = "Single Condonation";
                else if (parsedApc >= 55) condArr[semIdx] = "Double Condonation";
                else condArr[semIdx] = "Sem Out";
              }
            } else {
              condArr[semIdx] = rawStr.trim();
            }
          }
        }
      });

      const validSgpas = sgpaArr.filter((v): v is number => v !== null && !isNaN(v));
      const avgSgpa = validSgpas.length > 0 ? validSgpas.reduce((a, b) => a + b, 0) / validSgpas.length : null;

      const validAttn = attnArr.filter((v): v is number => v !== null && !isNaN(v));
      const avgAttn = validAttn.length > 0 ? validAttn.reduce((a, b) => a + b, 0) / validAttn.length : null;

      return {
        id: st.id,
        name: st.name,
        registerNo: st.registerNo,
        batch: st.batch || "N/A",
        rank: 0,
        maxSem: studentMaxSem,
        sgpa: sgpaArr,
        attendance: attnArr,
        condonation: condArr,
        averageSgpa: avgSgpa,
        averageAttendance: avgAttn,
      };
    });

    list.sort((a, b) => {
      const aVal = a.averageSgpa ?? -1;
      const bVal = b.averageSgpa ?? -1;
      return bVal - aVal;
    });

    list.forEach((item, index) => {
      item.rank = index + 1;
    });

    return list;
  }, [students, selectedBatch, searchQuery]);



  // WYSIWYG Print-to-PDF Exporter — uses native browser print for 100% pixel-perfect output
  const handleExportPdf = () => {
    if (!processedStudents.length) return;
    setIsExporting(true);
    setStatusMessage("Opening print dialog for pixel-perfect PDF...");

    try {
      // Build the CSS string (identical to the inline styles used for preview)
      const cssString = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          margin: 0;
          padding: 0;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        svg { max-width: 100%; overflow: hidden; }

        @page {
          size: A4 portrait;
          margin: 0;
        }

        .score-card {
          width: 210mm;
          height: 297mm;
          overflow: hidden;
          border: 2px solid #00662a;
          background: #fbfcf8;
          color: #050805;
          font-family: Georgia, "Times New Roman", serif;
          margin: 0 auto;
          box-sizing: border-box;
          page-break-after: always;
          break-after: page;
          display: block;
        }

        .card-header {
          display: grid;
          grid-template-columns: 88px 1fr 200px;
          align-items: center;
          padding: 10px 24px 8px;
          background:
            radial-gradient(ellipse at top right, rgba(255,238,126,0.8) 0 28%, transparent 29%),
            linear-gradient(105deg, #ffffff 0 55%, #bee8b9 56% 100%);
          border-bottom: 5px solid #ddec77;
        }

        .logo-mark { display: block; width: 76px; height: 76px; }
        .logo-mark img { display: block; width: 84px; height: 84px; object-fit: contain; }

        .brand h3 {
          margin: 0;
          color: #004f20;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-size: 22px;
          line-height: 1.05;
          text-transform: uppercase;
          font-weight: 800;
          white-space: pre-wrap;
        }

        .brand p {
          margin: 3px 0 0;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-size: 10px;
          font-weight: 700;
          color: #000000;
        }

        .contact {
          text-align: right;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.3;
          color: #000000;
        }

        .card-body { padding: 8px 20px 10px; }

        .title-block {
          position: relative;
          border-bottom: 1px solid #60826b;
          padding: 0 0 6px;
          text-align: center;
        }

        .title-block::after {
          position: absolute;
          left: 50%;
          bottom: -5px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #087a34;
          content: "";
          transform: translateX(-50%);
        }

        .title-block h4 {
          margin: 0;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-size: 16px;
          font-style: italic;
          font-weight: 800;
          color: #004f20;
        }

        .title-block p {
          margin: 3px 0 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 13px;
          font-weight: 700;
          color: #000000;
        }

        .student-name {
          margin: 12px 0 0;
          font-size: 44px;
          line-height: 1.15;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #050805;
          font-family: Georgia, "Times New Roman", serif;
          font-weight: normal;
        }

        .rank-badge {
          display: block;
          width: 220px;
          margin: 9px auto 12px;
          border-radius: 6px;
          padding: 8px 16px;
          color: #ffffff;
          background: linear-gradient(180deg, #0c8a35, #006021);
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-size: 16px;
          font-weight: 900;
          text-align: center;
          line-height: 1.3;
        }

        .stat-grid {
          display: table;
          width: 100%;
          table-layout: fixed;
          border-collapse: separate;
          border-spacing: 5px;
          margin: 0 0 8px;
        }

        .stat-grid-row { display: table-row; }

        .stat {
          display: table-cell;
          width: 25%;
          border: 1px solid #cdd8cf;
          border-radius: 6px;
          background: #e8f5eb;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          vertical-align: middle;
          padding: 6px 8px;
        }

        .stat-inner { display: table; width: 100%; }

        .stat-icon-cell {
          display: table-cell;
          vertical-align: middle;
          width: 34px;
          padding-right: 5px;
        }

        .stat-icon-cell svg { width: 28px; height: 28px; display: block; }

        .stat-text-cell { display: table-cell; vertical-align: middle; }

        .stat-label {
          display: block;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          color: #000000;
          line-height: 1.2;
        }

        .stat-value {
          display: block;
          margin-top: 1px;
          color: #004f20;
          font-size: 15px;
          font-weight: 900;
          white-space: nowrap;
          line-height: 1.2;
        }

        .section-title {
          border-radius: 4px 4px 0 0;
          padding: 6px 10px;
          color: #ffffff;
          background: linear-gradient(180deg, #006d2b, #004f20);
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-size: 13px;
          font-weight: 900;
          text-align: center;
          text-transform: uppercase;
        }

        .performance-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          background: rgba(255,255,255,0.76);
          font-size: 13px;
          font-family: Georgia, "Times New Roman", serif;
        }

        .performance-table th,
        .performance-table td {
          border: 1px solid #cad5cc;
          padding: 10px 8px;
          text-align: center;
          color: #000000;
        }

        .performance-table th {
          background: #f0f7ef;
          font-weight: 900;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          color: #000000;
          font-size: 12px;
        }

        .text-danger { color: #b51720; font-weight: 900; }

        .academic-status {
          width: 100%;
          border: 1px solid #c7d3c9;
          border-radius: 5px;
          margin: 8px 0;
          background: #f8fcf8;
          color: #004f20;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-size: 16px;
          font-weight: 900;
          text-transform: uppercase;
          text-align: center;
          padding: 17px 8px;
        }

        .chart-grid {
          display: table;
          width: 100%;
          table-layout: fixed;
          border-spacing: 5px;
          border-collapse: separate;
          margin: 8px 0;
        }

        .chart-grid-row { display: table-row; }

        .chart-card {
          display: table-cell;
          overflow: hidden;
          border: 1px solid #cbd6cd;
          border-radius: 6px;
          background: #ffffff;
          width: 33.33%;
          vertical-align: top;
        }

        .chart-title {
          padding: 4px 6px;
          color: #ffffff;
          background: linear-gradient(180deg, #006d2b, #004f20);
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-weight: 900;
          font-size: 9px;
          text-align: center;
          text-transform: uppercase;
        }

        .chart-card svg {
          display: block;
          width: 100%;
          height: 168px;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
        }

        .highlights {
          position: relative;
          display: table;
          width: 100%;
          table-layout: fixed;
          margin: 8px 0 12px;
          border: 1px solid #cbd6cd;
          border-radius: 6px;
          padding: 28px 4px 12px;
          background: #ffffff;
        }

        .highlights::before {
          position: absolute;
          top: 0;
          left: 50%;
          min-width: 160px;
          border-radius: 0 0 5px 5px;
          padding: 3px 10px;
          color: #ffffff;
          background: linear-gradient(180deg, #087a34, #00541f);
          content: "KEY HIGHLIGHTS";
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-weight: 900;
          text-align: center;
          transform: translateX(-50%);
          font-size: 10px;
        }

        .highlights-row { display: table-row; }

        .highlight {
          display: table-cell;
          text-align: center;
          vertical-align: top;
          border-right: 1px dashed #cbd6cd;
          padding: 0 4px 2px;
        }

        .highlight:last-child { border-right: 0; }

        .highlight svg {
          width: 30px;
          height: 30px;
          display: block;
          margin: 0 auto 3px;
        }

        .highlight span {
          display: block;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          color: #000000;
          margin-bottom: 2px;
        }

        .highlight strong {
          display: block;
          color: #004f20;
          font-size: 14px;
          font-weight: 900;
        }

        .highlight.red strong { color: #b51720; }

        .signatures {
          display: table;
          width: 100%;
          table-layout: fixed;
          padding: 4px 28px 0;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-weight: 900;
          text-align: center;
          color: #000000;
          margin-top: 18px;
        }

        .signatures-row { display: table-row; }

        .signature-line {
          display: table-cell;
          border-top: 2px solid #111111;
          padding-top: 6px;
          color: #000000;
          text-align: center;
          font-size: 11px;
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-weight: 900;
        }
      `;

      // Helper to generate SVG bar chart HTML
      const buildBarChartSvg = (title: string, values: (number|null)[], labels: string[], max: number, yLabel: string) => {
        const width = 240; const height = 160; const top = 22; const bottom = 26; const left = 32; const right = 10;
        const chartHeight = height - top - bottom; const chartWidth = width - left - right;
        const N = Math.max(1, values.length); const step = chartWidth / N;
        const barWidth = Math.min(24, Math.max(10, step * 0.55));
        const bars = values.map((val, index) => {
          const numericVal = val !== null && !isNaN(val) ? val : 0;
          const barH = Math.max(2, (numericVal / max) * chartHeight);
          const cx = left + (index + 0.5) * step;
          const x = cx - barWidth / 2;
          const y = top + chartHeight - barH;
          const valDisplay = val !== null && !isNaN(val) ? (max === 100 ? `${Math.round(val)}%` : val.toFixed(2)) : "-";
          return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="#278a2d"/>
            <text x="${cx}" y="${y - 4}" text-anchor="middle" font-size="8" font-weight="800" fill="#000">${valDisplay}</text>
            <text x="${cx}" y="${height - 6}" text-anchor="middle" font-size="8" fill="#000">${labels[index]}</text>`;
        }).join("");
        return `<div class="chart-card">
          <div class="chart-title">${title}</div>
          <svg viewBox="0 0 ${width} ${height}" style="display:block;width:100%;height:168px;">
            <line x1="${left}" y1="${top}" x2="${left}" y2="${top+chartHeight}" stroke="#bfc9c1"/>
            <line x1="${left}" y1="${top+chartHeight}" x2="${width-right}" y2="${top+chartHeight}" stroke="#bfc9c1"/>
            <text x="10" y="${top+chartHeight/2}" transform="rotate(-90 10 ${top+chartHeight/2})" font-size="9" fill="#000">${yLabel}</text>
            <text x="20" y="${top+chartHeight}" font-size="9" fill="#000">0</text>
            <text x="16" y="${top+5}" font-size="9" fill="#000">${max===100?"100":"10"}</text>
            ${bars}
          </svg>
        </div>`;
      };

      const buildLineChartSvg = (title: string, values: (number|null)[], labels: string[], max: number, yLabel: string) => {
        const width = 240; const height = 160; const top = 22; const bottom = 26; const left = 32; const right = 10;
        const chartHeight = height - top - bottom; const chartWidth = width - left - right;
        const N = Math.max(1, values.length); const step = chartWidth / N;
        const points = values.map((val, index) => {
          const numericVal = val !== null && !isNaN(val) ? val : 0;
          const cx = left + (index + 0.5) * step;
          const y = top + chartHeight - (numericVal / max) * chartHeight;
          return { x: cx, y, val, label: labels[index] };
        });
        const polylineStr = points.map(p => `${p.x},${p.y}`).join(" ");
        const dots = points.map((p, i) => {
          const valDisplay = p.val !== null && !isNaN(p.val) ? p.val.toFixed(2) : "-";
          return `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#087a34"/>
            <text x="${p.x}" y="${p.y - 6}" text-anchor="middle" font-size="8" font-weight="800" fill="#000">${valDisplay}</text>
            <text x="${p.x}" y="${height - 6}" text-anchor="middle" font-size="8" fill="#000">${p.label}</text>`;
        }).join("");
        return `<div class="chart-card">
          <div class="chart-title">${title}</div>
          <svg viewBox="0 0 ${width} ${height}" style="display:block;width:100%;height:168px;">
            <line x1="${left}" y1="${top}" x2="${left}" y2="${top+chartHeight}" stroke="#bfc9c1"/>
            <line x1="${left}" y1="${top+chartHeight}" x2="${width-right}" y2="${top+chartHeight}" stroke="#bfc9c1"/>
            <text x="10" y="${top+chartHeight/2}" transform="rotate(-90 10 ${top+chartHeight/2})" font-size="9" fill="#000">${yLabel}</text>
            <text x="20" y="${top+chartHeight}" font-size="9" fill="#000">0</text>
            <text x="16" y="${top+5}" font-size="9" fill="#000">${max===100?"100":"10"}</text>
            <polyline points="${polylineStr}" fill="none" stroke="#087a34" stroke-width="2"/>
            ${dots}
          </svg>
        </div>`;
      };

      const ROMAN = ["I","II","III","IV","V","VI","VII","VIII"];

      const svgIdCardIcon = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#087a34" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 9h4M14 12h4M14 15h4"/></svg>`;
      const svgGradCapIcon = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#087a34" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;
      const svgBarIcon = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#087a34" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`;
      const svgUsersIcon = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#087a34" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
      const svgAwardIcon = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00662a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto 4px;"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`;
      const svgTargetIcon = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00662a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto 4px;"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
      const svgTrophyIcon = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00662a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto 4px;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
      const svgBadgeIcon = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00662a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto 4px;"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>`;
      const svgBadgeInlineIcon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#004f20" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:8px;"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>`;
      const svgLogoImg = `<img src="/safi-logo.jfif" alt="SAFI Logo" width="112" height="112" style="display:block;object-fit:contain;"/>`;
      

      const buildCardHtml = (student: ProcessedStudent) => {
        const maxSem = student.maxSem || 4;
        const semesters = Array.from({ length: maxSem }, (_, i) => `Semester ${ROMAN[i] || i+1}`);
        const shortSemesters = Array.from({ length: maxSem }, (_, i) => `Sem ${ROMAN[i] || i+1}`);
        const averageSgpa = student.averageSgpa;
        const averageAttendance = student.averageAttendance;
        const percentageText = averageSgpa !== null ? `${(averageSgpa * 10).toFixed(2)}%` : "-";

        let bestIdx = 0; let maxVal = -1;
        student.sgpa.forEach((val, idx) => { if (val !== null && val > maxVal) { maxVal = val; bestIdx = idx; } });
        const highestSgpaText = student.sgpa[bestIdx] !== null ? `${shortSemesters[bestIdx]} (${student.sgpa[bestIdx]!.toFixed(3)})` : "N/A";

        const statusFn = (sgpa: number | null) => {
          if (sgpa === null || isNaN(sgpa)) return "Incomplete";
          if (sgpa >= 9) return "Outstanding";
          if (sgpa >= 8) return "Excellent";
          if (sgpa >= 7) return "Good";
          if (sgpa >= 6) return "Satisfactory";
          return "Need Improvement";
        };
        const status = statusFn(averageSgpa);

        const condRemarks = student.condonation.filter((c): c is string => c !== null && c.trim() !== "");
        let condonationText = "No condonation";
        if (condRemarks.length) {
          const hasSemOut = condRemarks.some(r => /sem\s*out|semout/i.test(r));
          if (hasSemOut) {
            const semOutList = student.condonation.map((val, idx) => val && /sem\s*out|semout/i.test(val) ? `Sem ${idx+1}` : null).filter(Boolean);
            condonationText = semOutList.length ? `Sem Out: ${semOutList.join(", ")}` : "Sem Out";
          } else {
            const semList: string[] = [];
            student.condonation.forEach((val, idx) => { if (val && val !== "Eligible") semList.push(`Sem ${idx+1}`); });
            condonationText = semList.length ? semList.join(", ") : "No condonation";
          }
        }

        const tableRows = semesters.map((sem, i) => {
          const sgpa = student.sgpa[i] !== null ? student.sgpa[i]!.toFixed(3) : "-";
          const attn = student.attendance[i] !== null ? `${student.attendance[i]!.toFixed(2)}%` : "-";
          return `<tr><td>${sem}</td><td>${sgpa}</td><td>${attn}</td></tr>`;
        }).join("");

        const barChart = buildBarChartSvg("1. SGPA Comparison", student.sgpa, shortSemesters, 10, "SGPA");
        const lineChart = buildLineChartSvg("2. SGPA Trend", student.sgpa, shortSemesters, 10, "SGPA");
        const attnChart = buildBarChartSvg("3. Attendance Comparison", student.attendance, shortSemesters, 100, "Attendance (%)");

        const condonationWarning = condonationText !== "No condonation";
        const percentageWarning = averageSgpa !== null && averageSgpa * 10 < 60;
        const statusWarning = status === "Need Improvement";

        const instituteLine = instituteName.split("\n").join("<br>");

        return `<article class="score-card">
          <header class="card-header">
            <div class="logo-mark"><img src="/safi-logo.jfif" alt="SAFI Logo"/></div>
            <div class="brand">
              <h3>${instituteLine}</h3>
              <p>Affiliated to the University of Calicut, Recognised by UGC 2(f)</p>
              <p>Accredited by NAAC with A++ (3.54)</p>
            </div>
            <div class="contact">${contactLine.split("|").map(l => l.trim()).join("<br>")}</div>
          </header>
          <div class="card-body">
            <section class="title-block">
              <h4>${departmentName}</h4>
              <p>${programTitle}</p>
            </section>
            <h2 class="student-name">${student.name}</h2>
            <div class="rank-badge">CLASS RANK : ${student.rank}</div>
            <div class="stat-grid">
              <div class="stat-grid-row">
                <div class="stat">
                  <div class="stat-inner">
                    <div class="stat-icon-cell">${svgIdCardIcon}</div>
                    <div class="stat-text-cell"><span class="stat-label">REGISTER NO</span><span class="stat-value">${student.registerNo}</span></div>
                  </div>
                </div>
                <div class="stat">
                  <div class="stat-inner">
                    <div class="stat-icon-cell">${svgGradCapIcon}</div>
                    <div class="stat-text-cell"><span class="stat-label">AVERAGE SGPA</span><span class="stat-value">${averageSgpa !== null ? averageSgpa.toFixed(3) : "-"}</span></div>
                  </div>
                </div>
                <div class="stat">
                  <div class="stat-inner">
                    <div class="stat-icon-cell">${svgBarIcon}</div>
                    <div class="stat-text-cell"><span class="stat-label">PERCENTAGE</span><span class="stat-value">${percentageText}</span></div>
                  </div>
                </div>
                <div class="stat">
                  <div class="stat-inner">
                    <div class="stat-icon-cell">${svgUsersIcon}</div>
                    <div class="stat-text-cell"><span class="stat-label">AVERAGE ATTENDANCE</span><span class="stat-value">${averageAttendance !== null ? `${averageAttendance.toFixed(2)}%` : "-"}</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="section-title">SEMESTER PERFORMANCE</div>
            <table class="performance-table">
              <thead><tr><th>Semester</th><th>SGPA</th><th>Attendance (%)</th></tr></thead>
              <tbody>${tableRows}</tbody>
            </table>
            <div class="academic-status">${svgBadgeInlineIcon} ACADEMIC STATUS : ${status}</div>
            <div class="chart-grid">
              <div class="chart-grid-row">
                ${barChart}${lineChart}${attnChart}
              </div>
            </div>
            <div class="highlights">
              <div class="highlights-row">
                <div class="highlight${condonationWarning ? " red" : ""}">
                  ${svgAwardIcon}<span>Condonation</span><strong>${condonationText}</strong>
                </div>
                <div class="highlight${percentageWarning ? " red" : ""}">
                  ${svgGradCapIcon}<span>Average SGPA</span><strong>${averageSgpa !== null ? averageSgpa.toFixed(3) : "-"}</strong>
                </div>
                <div class="highlight${percentageWarning ? " red" : ""}">
                  ${svgTargetIcon}<span>Percentage</span><strong>${percentageText}</strong>
                </div>
                <div class="highlight">
                  ${svgTrophyIcon}<span>Highest SGPA</span><strong>${highestSgpaText}</strong>
                </div>
                <div class="highlight">
                  ${svgUsersIcon}<span>Average Attendance</span><strong>${averageAttendance !== null ? `${averageAttendance.toFixed(2)}%` : "-"}</strong>
                </div>
                <div class="highlight${statusWarning ? " red" : ""}">
                  ${svgBadgeIcon}<span>Academic Status</span><strong>${status}</strong>
                </div>
              </div>
            </div>
            <div class="signatures">
              <div class="signatures-row">
                <div class="signature-line">ADVISOR</div>
                <div class="signature-line">HOD</div>
                <div class="signature-line">PARENT</div>
              </div>
            </div>
          </div>
        </article>`;
      };

      const allCardsHtml = processedStudents.map(buildCardHtml).join("\n");

      const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SAFI Student Scorecards — ${selectedBatch || "All"}</title>
  <style>${cssString}</style>
</head>
<body>
  ${allCardsHtml}
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 2000);
    };
  <\/script>
</body>
</html>`;

      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) {
        setStatusMessage("Pop-up blocked! Please allow pop-ups for this site and try again.");
        setIsExporting(false);
        return;
      }
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();

      setStatusMessage(`Print dialog opened for ${processedStudents.length} scorecards. Save as PDF using your browser's print dialog!`);
    } catch (err) {
      console.error("PDF export error:", err);
      setStatusMessage("PDF export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full text-slate-200">
      {/* Exact scorecardmaker CSS Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

        .score-card {
          width: 1000px;
          border: 2px solid #00662a;
          background: #fbfcf8;
          box-shadow: 0 18px 45px rgba(17, 42, 23, 0.12);
          color: #050805 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          margin: 0 auto 32px auto;
          box-sizing: border-box;
          padding-bottom: 16px;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: none !important;
          }
          .score-card {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
          }
        }

        .card-header {
          display: grid;
          grid-template-columns: 120px 1fr 300px;
          align-items: center;
          min-height: 150px;
          padding: 20px 32px 16px;
          background:
            radial-gradient(ellipse at top right, rgba(255, 238, 126, 0.8) 0 28%, transparent 29%),
            linear-gradient(105deg, #ffffff 0 55%, #bee8b9 56% 100%);
          border-bottom: 8px solid #ddec77;
        }

        .logo-mark {
          display: grid;
          place-items: center;
          width: 112px;
          height: 112px;
          border-radius: 10px;
          background: transparent;
        }

        .logo-mark img {
          display: block;
          width: 128px;
          height: 128px;
          object-fit: contain;
        }

        .brand h3 {
          margin: 0;
          color: #004f20 !important;
          font-family: Inter, "Segoe UI", Arial, sans-serif !important;
          font-size: 40px;
          line-height: 1.05;
          text-transform: uppercase;
          font-weight: 800;
          white-space: pre-wrap;
        }

        .brand p {
          margin: 12px 0 0;
          font-family: Inter, "Segoe UI", Arial, sans-serif !important;
          font-size: 14px;
          font-weight: 700;
          color: #000000 !important;
        }

        .contact {
          text-align: right;
          font-family: Inter, "Segoe UI", Arial, sans-serif !important;
          font-size: 17px;
          font-weight: 800;
          line-height: 1.35;
          color: #000000 !important;
        }

        .card-body {
          padding: 20px 28px 28px;
        }

        .title-block {
          position: relative;
          border-bottom: 1px solid #60826b;
          padding: 0 0 12px;
          text-align: center;
        }

        .title-block::after {
          position: absolute;
          left: 50%;
          bottom: -6px;
          width: 12px;
          height: 12px;
          background: #00662a;
          content: "";
          transform: translateX(-50%) rotate(45deg);
        }

        .title-block h4 {
          margin: 0;
          color: #004f20 !important;
          font-size: 27px;
          font-weight: 800;
          font-family: Georgia, "Times New Roman", serif !important;
        }

        .title-block p {
          margin: 6px 0 0;
          color: #050805 !important;
          font-size: 25px;
          font-weight: 800;
          font-family: Georgia, "Times New Roman", serif !important;
        }

        .student-name {
          margin: 18px 0 16px;
          padding-bottom: 10px;
          color: #004f20 !important;
          text-align: center;
          font-size: 54px;
          line-height: 1.25;
          font-family: Georgia, "Times New Roman", serif !important;
          font-weight: normal;
        }

        .rank-badge {
          width: max-content;
          min-width: 280px;
          margin: 8px auto 16px;
          border-radius: 8px;
          padding: 10px 24px;
          color: #ffffff !important;
          background: linear-gradient(180deg, #0c8a35, #006021);
          font-family: Inter, "Segoe UI", Arial, sans-serif !important;
          font-size: 22px;
          font-weight: 900;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          box-sizing: border-box;
        }

        .stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin: 18px 0 20px;
        }

        .stat {
          display: table;
          width: 100%;
          min-height: 106px;
          height: 106px;
          border: 1px solid #cdd8cf;
          border-radius: 8px;
          background: #e8f5eb;
          font-family: Inter, "Segoe UI", Arial, sans-serif !important;
          box-sizing: border-box;
          table-layout: fixed;
        }

        .stat-icon-wrapper {
          display: table-cell;
          vertical-align: middle;
          width: 58px;
          padding: 12px 0 12px 10px;
        }

        .stat-icon-wrapper svg {
          width: 42px;
          height: 42px;
          color: #087a34;
          display: block;
        }

        .stat-content-wrapper {
          display: table-cell;
          vertical-align: middle;
          text-align: left;
          padding: 12px 10px 12px 10px;
        }

        .stat span {
          display: block;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          color: #000000 !important;
          line-height: 1.2;
        }

        .stat strong {
          display: block;
          margin-top: 2px;
          color: #004f20 !important;
          font-size: 20px;
          font-weight: 900;
          white-space: nowrap;
          line-height: 1.35;
          padding-bottom: 4px;
          overflow: visible;
        }

        .section-title {
          border-radius: 6px 6px 0 0;
          padding: 11px 14px;
          color: #ffffff !important;
          background: linear-gradient(180deg, #006d2b, #004f20);
          font-family: Inter, "Segoe UI", Arial, sans-serif !important;
          font-size: 18px;
          font-weight: 900;
          text-align: center;
          text-transform: uppercase;
        }

        .performance-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          background: rgba(255, 255, 255, 0.76);
          font-size: 19px;
          font-family: Georgia, "Times New Roman", serif !important;
        }

        .performance-table th,
        .performance-table td {
          border: 1px solid #cad5cc;
          padding: 12px;
          text-align: center;
          color: #000000 !important;
        }

        .performance-table th {
          background: #f0f7ef;
          font-weight: 900;
          font-family: Inter, "Segoe UI", Arial, sans-serif !important;
          color: #000000 !important;
        }

        .text-danger {
          color: #b51720 !important;
          font-weight: 900;
        }

        .academic-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          min-height: 66px;
          border: 1px solid #c7d3c9;
          border-radius: 6px;
          margin: 16px 0;
          background: #f8fcf8;
          color: #004f20 !important;
          font-family: Inter, "Segoe UI", Arial, sans-serif !important;
          font-size: 24px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .academic-status svg {
          width: 42px;
          height: 42px;
          color: #087a34;
        }

        .chart-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 16px 0;
        }

        .chart-card {
          overflow: hidden;
          border: 1px solid #cbd6cd;
          border-radius: 8px;
          background: #ffffff;
        }

        .chart-title {
          padding: 9px;
          color: #ffffff !important;
          background: linear-gradient(180deg, #006d2b, #004f20);
          font-family: Inter, "Segoe UI", Arial, sans-serif !important;
          font-weight: 900;
          font-size: 12px;
          text-align: center;
          text-transform: uppercase;
        }

        .chart-card svg {
          display: block;
          width: 100%;
          height: 190px;
          font-family: Inter, "Segoe UI", Arial, sans-serif !important;
        }

        .highlights {
          position: relative;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0;
          margin: 12px 0 16px;
          border: 1px solid #cbd6cd;
          border-radius: 8px;
          padding: 34px 6px 12px;
          background: #ffffff;
        }

        .highlights::before {
          position: absolute;
          top: 0;
          left: 50%;
          min-width: 220px;
          border-radius: 0 0 6px 6px;
          padding: 6px 12px;
          color: #ffffff !important;
          background: linear-gradient(180deg, #087a34, #00541f);
          content: "KEY HIGHLIGHTS";
          font-family: Inter, "Segoe UI", Arial, sans-serif !important;
          font-weight: 900;
          text-align: center;
          transform: translateX(-50%);
          font-size: 13px;
        }

        .highlight {
          display: grid;
          justify-items: center;
          align-content: start;
          gap: 8px;
          min-height: 112px;
          border-right: 1px dashed #cbd6cd;
          padding: 0 8px;
          text-align: center;
          font-family: Inter, "Segoe UI", Arial, sans-serif !important;
        }

        .highlight:last-child {
          border-right: 0;
        }

        .highlight svg {
          width: 42px;
          height: 42px;
          color: #00662a;
        }

        .highlight span {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          color: #000000 !important;
        }

        .highlight strong {
          color: #004f20 !important;
          font-size: 18px;
          font-weight: 900;
        }

        .highlight.red strong,
        .highlight.red svg {
          color: #b51720 !important;
        }

        .signatures {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 80px;
          padding: 6px 28px 0;
          font-family: Inter, "Segoe UI", Arial, sans-serif !important;
          font-weight: 900;
          text-align: center;
          color: #000000 !important;
          margin-top: 14px;
        }

        .signature-line {
          border-top: 2px solid #111111;
          padding-top: 12px;
          color: #000000 !important;
        }
      `}</style>

      {/* Offscreen Sandbox Exporter */}
      {exportingStudent && (
        <div
          ref={offscreenExportRef}
          style={{
            position: "absolute",
            left: "0px",
            top: "0px",
            width: "1000px",
            overflow: "hidden",
            opacity: 0,
            pointerEvents: "none",
            zIndex: -9999,
          }}
        >
          <ScorecardItem
            student={exportingStudent}
            instituteName={instituteName}
            departmentName={departmentName}
            programTitle={programTitle}
            contactLine={contactLine}
          />
        </div>
      )}

      {/* TOP CONTROL PANEL (Landscape / Horizontal Header Toolbar) */}
      <div className="w-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-extrabold uppercase tracking-wider mb-1">
              <Award className="w-4 h-4" /> Academic Scorecard Generator
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Score Card Builder</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              High-performance automated scorecard engine with memory-optimized PDF export.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {statusMessage && (
              <div className="px-3 py-2 bg-slate-950/80 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 hidden lg:flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
            <button
              onClick={handleExportPdf}
              disabled={isExporting || processedStudents.length === 0}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg transition-all text-xs uppercase tracking-wide cursor-pointer shrink-0"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? "Generating PDF..." : `Download PDF (${processedStudents.length} Scorecards)`}
            </button>
          </div>
        </div>

        {/* Controls Row: Batch Filter & Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-300 mr-2">Batch:</span>
            <button
              onClick={() => handleBatchSelect("All")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedBatch === "All"
                  ? "bg-rose-500 text-white shadow-md"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              All Batches
            </button>
            {availableBatches.map((b) => (
              <button
                key={b}
                onClick={() => handleBatchSelect(b)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedBatch === b
                    ? "bg-rose-500 text-white shadow-md"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search student by name or Reg No..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors font-medium"
            />
          </div>
        </div>

        {/* Header Template Settings */}
        <div className="pt-4 border-t border-slate-800/80">
          <span className="text-xs font-bold text-slate-300 block mb-3">Header Template Settings</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Institute Name</label>
              <input
                type="text"
                value={instituteName}
                onChange={(e) => setInstituteName(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Department Name</label>
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Programme Title</label>
              <input
                type="text"
                value={programTitle}
                onChange={(e) => setProgramTitle(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Contact Line</label>
              <input
                type="text"
                value={contactLine}
                onChange={(e) => setContactLine(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* GENERATED CARDS PREVIEW */}
      <div className="w-full overflow-x-auto min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg text-slate-200 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-rose-400" />
              <span>Generated Cards Preview</span>
            </h3>
            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
              {processedStudents.length} student card{processedStudents.length === 1 ? "" : "s"}
            </span>
          </div>

        </div>

        {processedStudents.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-slate-300">No student scorecards match your current filters.</p>
            <p className="text-xs text-slate-500 mt-1">
              Select a different batch or verify that student marks have been uploaded in the system.
            </p>
          </div>
        ) : (
          <div ref={cardsContainerRef} className="space-y-8 flex flex-col items-center">
            {processedStudents.map((student) => (
              <ScorecardItem
                key={student.id}
                student={student}
                instituteName={instituteName}
                departmentName={departmentName}
                programTitle={programTitle}
                contactLine={contactLine}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Single Score Card Component (100% exact match to scorecardmaker design)
function ScorecardItem({
  student,
  instituteName,
  departmentName,
  programTitle,
  contactLine,
}: {
  student: ProcessedStudent;
  instituteName: string;
  departmentName: string;
  programTitle: string;
  contactLine: string;
}) {
  const maxSem = student.maxSem || 4;
  const semesters = Array.from({ length: maxSem }, (_, i) => `Semester ${ROMAN_NUMERALS[i] || i + 1}`);
  const shortSemesters = Array.from({ length: maxSem }, (_, i) => `Sem ${ROMAN_NUMERALS[i] || i + 1}`);

  const averageSgpa = student.averageSgpa;
  const averageAttendance = student.averageAttendance;

  const percentageText = averageSgpa !== null ? `${(averageSgpa * 10).toFixed(2)}%` : "-";
  const percentageWarning = averageSgpa !== null && averageSgpa * 10 < 60;

  const bestSgpaIndex = useMemo(() => {
    let bestIdx = 0;
    let maxVal = -1;
    student.sgpa.forEach((val, idx) => {
      if (val !== null && val > maxVal) {
        maxVal = val;
        bestIdx = idx;
      }
    });
    return maxVal >= 0 ? bestIdx : 0;
  }, [student.sgpa]);

  const highestSgpaText =
    student.sgpa[bestSgpaIndex] !== null
      ? `${shortSemesters[bestSgpaIndex]} (${student.sgpa[bestSgpaIndex]!.toFixed(3)})`
      : "N/A";

  const status = computeAcademicStatus(averageSgpa);
  const statusWarning = status === "Need Improvement";

  const condonationText = getCondonationSummary(student.condonation);
  const condonationWarning = condonationText !== "No condonation";

  return (
    <article className="score-card select-none">
      {/* Header */}
      <header className="card-header">
        <div className="logo-mark">
          <img src="/safi-logo.jfif" alt="SAFI Logo" />
        </div>
        <div className="brand">
          <h3>{instituteName}</h3>
          <p>Affiliated to the University of Calicut, Recognised by UGC 2(f)</p>
          <p>Accredited by NAAC with A++ (3.54)</p>
        </div>
        <div className="contact">
          {contactLine.split("|").map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              {line.trim()}
            </React.Fragment>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="card-body">
        {/* Title Block */}
        <section className="title-block">
          <h4>{departmentName}</h4>
          <p>{programTitle}</p>
        </section>

        {/* Student Name */}
        <h2 className="student-name">{student.name}</h2>

        {/* Rank Badge */}
        <div className="rank-badge">CLASS RANK : {student.rank}</div>

        {/* Stat Grid */}
        <section className="stat-grid">
          <div className="stat">
            <div className="stat-icon-wrapper"><IdCard /></div>
            <div className="stat-content-wrapper">
              <span>REGISTER NO</span>
              <strong>{student.registerNo}</strong>
            </div>
          </div>
          <div className="stat">
            <div className="stat-icon-wrapper"><GraduationCap /></div>
            <div className="stat-content-wrapper">
              <span>AVERAGE SGPA</span>
              <strong>{averageSgpa !== null ? averageSgpa.toFixed(3) : "-"}</strong>
            </div>
          </div>
          <div className="stat">
            <div className="stat-icon-wrapper"><BarChart3 /></div>
            <div className="stat-content-wrapper">
              <span>PERCENTAGE</span>
              <strong>{percentageText}</strong>
            </div>
          </div>
          <div className="stat">
            <div className="stat-icon-wrapper"><Users /></div>
            <div className="stat-content-wrapper">
              <span>AVERAGE ATTENDANCE</span>
              <strong>{averageAttendance !== null ? `${averageAttendance.toFixed(2)}%` : "-"}</strong>
            </div>
          </div>
        </section>

        {/* Semester Performance Table */}
        <div className="section-title">Semester Performance</div>
        <table className="performance-table">
          <thead>
            <tr>
              <th>Semester</th>
              <th>SGPA</th>
              <th>Attendance (%)</th>
            </tr>
          </thead>
          <tbody>
            {semesters.map((sem, idx) => {
              const sgpaVal = student.sgpa[idx];
              const attnVal = student.attendance[idx];
              const sgpaDisplay = sgpaVal !== null ? sgpaVal.toFixed(3) : "Result Not Available";
              const attnDisplay = attnVal !== null ? `${attnVal}%` : "-";
              const sgpaClass = sgpaDisplay === "Result Not Available" ? "text-danger" : "";

              return (
                <tr key={sem}>
                  <td>{sem}</td>
                  <td className={sgpaClass}>{sgpaDisplay}</td>
                  <td>{attnDisplay}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Academic Status */}
        <section className="academic-status">
          <BadgeCheck />
          <span>Academic Status : {status}</span>
        </section>

        {/* Dynamic SVG Chart Grid */}
        <section className="chart-grid">
          <SvgBarChart title="1. SGPA Comparison" values={student.sgpa} labels={shortSemesters} max={10} yLabel="SGPA" />
          <SvgLineChart title="2. SGPA Trend" values={student.sgpa} labels={shortSemesters} max={10} yLabel="SGPA" />
          <SvgBarChart title="3. Attendance Comparison" values={student.attendance} labels={shortSemesters} max={100} yLabel="Attendance (%)" />
        </section>

        {/* Key Highlights Container */}
        <section className="highlights">
          <div className={`highlight ${condonationWarning ? "red" : ""}`}>
            <Award />
            <span>Condonation</span>
            <strong>{condonationText}</strong>
          </div>
          <div className={`highlight ${percentageWarning ? "red" : ""}`}>
            <GraduationCap />
            <span>Average SGPA</span>
            <strong>{averageSgpa !== null ? averageSgpa.toFixed(3) : "-"}</strong>
          </div>
          <div className={`highlight ${percentageWarning ? "red" : ""}`}>
            <Target />
            <span>Percentage</span>
            <strong>{percentageText}</strong>
          </div>
          <div className="highlight">
            <Trophy />
            <span>Highest SGPA</span>
            <strong>{highestSgpaText}</strong>
          </div>
          <div className="highlight">
            <Users />
            <span>Average Attendance</span>
            <strong>{averageAttendance !== null ? `${averageAttendance.toFixed(2)}%` : "-"}</strong>
          </div>
          <div className={`highlight ${statusWarning ? "red" : ""}`}>
            <BadgeCheck />
            <span>Academic Status</span>
            <strong>{status}</strong>
          </div>
        </section>

        {/* Signatures Row */}
        <section className="signatures">
          <div className="signature-line">ADVISOR</div>
          <div className="signature-line">HOD</div>
          <div className="signature-line">PARENT</div>
        </section>
      </div>
    </article>
  );
}

// Dynamic SVG Bar Chart Component
function SvgBarChart({
  title,
  values,
  labels,
  max,
  yLabel,
}: {
  title: string;
  values: (number | null)[];
  labels: string[];
  max: number;
  yLabel: string;
}) {
  const width = 300;
  const height = 250;
  const top = 34;
  const bottom = 38;
  const left = 42;
  const right = 18;
  const chartHeight = height - top - bottom;
  const chartWidth = width - left - right;
  const N = Math.max(1, values.length);
  const step = chartWidth / N;
  const barWidth = Math.min(34, Math.max(14, step * 0.55));

  return (
    <div className="chart-card">
      <div className="chart-title">
        {title}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`}>
        {/* Axes */}
        <line x1={left} y1={top} x2={left} y2={top + chartHeight} stroke="#bfc9c1" />
        <line x1={left} y1={top + chartHeight} x2={width - right} y2={top + chartHeight} stroke="#bfc9c1" />
        <text x="16" y={top + chartHeight / 2} transform={`rotate(-90 16 ${top + chartHeight / 2})`} fontSize="13" fill="#000000">
          {yLabel}
        </text>
        <text x="26" y={top + chartHeight} fontSize="12" fill="#000000">0</text>
        <text x="22" y={top + 6} fontSize="12" fill="#000000">{max === 100 ? "100" : "10"}</text>

        {/* Bars */}
        {values.map((val, index) => {
          const numericVal = val !== null && !isNaN(val) ? val : 0;
          const barHeight = Math.max(2, (numericVal / max) * chartHeight);
          const cx = left + (index + 0.5) * step;
          const x = cx - barWidth / 2;
          const y = top + chartHeight - barHeight;
          const valDisplay = val !== null && !isNaN(val) ? (max === 100 ? `${Math.round(val)}%` : val.toFixed(3)) : "-";

          return (
            <g key={index}>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill="#278a2d" />
              <text x={cx} y={y - 8} textAnchor="middle" fontSize="11" fontWeight="800" fill="#000000">
                {valDisplay}
              </text>
              <text x={cx} y={height - 12} textAnchor="middle" fontSize="11" fill="#000000">
                {labels[index]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Dynamic SVG Line Chart Component
function SvgLineChart({
  title,
  values,
  labels,
  max,
  yLabel,
}: {
  title: string;
  values: (number | null)[];
  labels: string[];
  max: number;
  yLabel: string;
}) {
  const width = 300;
  const height = 250;
  const top = 34;
  const bottom = 38;
  const left = 42;
  const right = 18;
  const chartHeight = height - top - bottom;
  const chartWidth = width - left - right;
  const N = Math.max(1, values.length);
  const step = chartWidth / N;

  const points = values.map((val, index) => {
    const numericVal = val !== null && !isNaN(val) ? val : 0;
    const cx = left + (index + 0.5) * step;
    const y = top + chartHeight - (numericVal / max) * chartHeight;
    return { x: cx, y, val };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="chart-card">
      <div className="chart-title">
        {title}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`}>
        {/* Axes */}
        <line x1={left} y1={top} x2={left} y2={top + chartHeight} stroke="#bfc9c1" />
        <line x1={left} y1={top + chartHeight} x2={width - right} y2={top + chartHeight} stroke="#bfc9c1" />
        <text x="16" y={top + chartHeight / 2} transform={`rotate(-90 16 ${top + chartHeight / 2})`} fontSize="13" fill="#000000">
          {yLabel}
        </text>
        <text x="26" y={top + chartHeight} fontSize="12" fill="#000000">0</text>
        <text x="22" y={top + 6} fontSize="12" fill="#000000">{max === 100 ? "100" : "10"}</text>

        {/* Polyline */}
        <polyline points={polylineStr} fill="none" stroke="#087a34" strokeWidth="4" />

        {/* Circles & Labels */}
        {points.map((p, index) => {
          const valDisplay = p.val !== null && !isNaN(p.val) ? p.val.toFixed(3) : "-";
          return (
            <g key={index}>
              <circle cx={p.x} cy={p.y} r="5" fill="#087a34" />
              <text x={p.x} y={p.y - 11} textAnchor="middle" fontSize="11" fontWeight="800" fill="#000000">
                {valDisplay}
              </text>
              <text x={p.x} y={height - 12} textAnchor="middle" fontSize="11" fill="#000000">
                {labels[index]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Helpers
function computeAcademicStatus(sgpa: number | null): string {
  if (sgpa === null || isNaN(sgpa)) return "Incomplete";
  if (sgpa >= 9) return "Outstanding";
  if (sgpa >= 8) return "Excellent";
  if (sgpa >= 7) return "Good";
  if (sgpa >= 6) return "Satisfactory";
  return "Need Improvement";
}

function getCondonationSummary(condonations: (string | null)[]): string {
  const remarks = condonations.filter((c): c is string => c !== null && c.trim() !== "");
  if (!remarks.length) return "No condonation";

  const hasSemOut = remarks.some((r) => /sem\s*out|semout/i.test(r));
  if (hasSemOut) {
    const semOutList = condonations
      .map((val, idx) => (val && /sem\s*out|semout/i.test(val) ? `Sem ${idx + 1}` : null))
      .filter(Boolean);
    return semOutList.length ? `Sem Out: ${semOutList.join(", ")}` : "Sem Out";
  }

  const semList: string[] = [];
  condonations.forEach((val, idx) => {
    if (val && val !== "Eligible") {
      semList.push(`Sem ${idx + 1}`);
    }
  });

  return semList.length ? semList.join(", ") : "No condonation";
}
