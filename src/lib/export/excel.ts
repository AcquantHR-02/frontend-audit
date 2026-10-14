/**
 * Excel exports (spec §12.12) mirroring the real-world files in spec §5:
 * the management score roll-up (File 3) and the detailed audit report (File 2).
 * ExcelJS is loaded on demand so it never weighs on first page load.
 */
import type { Workbook, Worksheet } from "exceljs";
import { formatScore } from "@/lib/domain";
import type { AuditItemResult, AuditRunView, ScoreCounts } from "@/types/domain";

const BRAND = "FF314F8B";
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" } };

async function newWorkbook(): Promise<Workbook> {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "Audit Management System · Acquant HR";
  wb.created = new Date();
  return wb;
}

function styleHeader(sheet: Worksheet, rowNumber: number) {
  const row = sheet.getRow(rowNumber);
  row.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
    cell.alignment = { vertical: "middle" };
  });
  sheet.views = [{ state: "frozen", ySplit: rowNumber }];
}

function title(sheet: Worksheet, text: string, subtitle: string) {
  sheet.addRow([text]).font = { bold: true, size: 14 };
  sheet.addRow([subtitle]).font = { color: { argb: "FF6B7280" } };
  sheet.addRow([]);
}

async function download(wb: Workbook, fileName: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Raw counts are written; the score is rounded once per row (§10). */
const scoreRow = (label: string, s: ScoreCounts) => [
  label,
  s.complied,
  s.notComplied,
  s.notApplicable,
  s.assignedTotal,
  formatScore(s),
];

export interface RollupRow {
  partyName: string;
  auditType: string;
  score: ScoreCounts;
  units: { unitCode: string; unitName: string; score: ScoreCounts }[];
}

export async function exportScoreRollup(rows: RollupRow[], total: ScoreCounts, period: string) {
  const wb = await newWorkbook();
  const summary = wb.addWorksheet("Score report");
  title(summary, "Compliance score report", period);
  summary.addRow(["Audited party", "Complied", "Not complied", "NA", "Items", "Score"]);
  styleHeader(summary, 4);
  rows.forEach((r) => summary.addRow(scoreRow(r.partyName, r.score)));
  summary.addRow(scoreRow("Grand total", total)).font = { bold: true };
  summary.columns = [{ width: 34 }, { width: 12 }, { width: 14 }, { width: 10 }, { width: 10 }, { width: 10 }];

  const byUnit = wb.addWorksheet("By unit");
  title(byUnit, "Score by audited party and unit", period);
  byUnit.addRow(["Audited party", "Unit", "Complied", "Not complied", "NA", "Items", "Score"]);
  styleHeader(byUnit, 4);
  rows.forEach((r) =>
    r.units.forEach((u) =>
      byUnit.addRow([r.partyName, `${u.unitCode} · ${u.unitName}`, ...scoreRow("", u.score).slice(1)]),
    ),
  );
  byUnit.columns = [
    { width: 30 },
    { width: 28 },
    { width: 12 },
    { width: 14 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
  ];

  await download(wb, `Score_Report_${period.replace(/[^\w]+/g, "_")}.xlsx`);
}

const statusLabel = { COMPLIED: "Complied", NOT_COMPLIED: "Not complied", NOT_APPLICABLE: "NA" } as const;

export async function exportRunReport(run: AuditRunView, items: AuditItemResult[]) {
  const wb = await newWorkbook();
  const sheet = wb.addWorksheet(run.code);
  title(
    sheet,
    `${run.partyName} · ${run.unitCode} ${run.unitName}`,
    `${run.code} · ${run.auditType === "VENDOR" ? "Vendor audit" : "PE audit"} · Activity ${run.activityPeriodStart} to ${run.activityPeriodEnd} · Score ${formatScore(run.score)}`,
  );
  sheet.addRow(["Unit", "Period", "Act", "Requirement", "Cadence", "Status", "Audit remarks"]);
  styleHeader(sheet, 4);
  for (const item of items) {
    sheet.addRow([
      run.unitCode,
      item.periodStart
        ? `${item.periodStart} to ${item.periodEnd}`
        : `${run.activityPeriodStart} to ${run.activityPeriodEnd}`,
      item.actNameSnapshot,
      item.descriptionSnapshot,
      item.cadenceSnapshot,
      item.complianceStatus ? statusLabel[item.complianceStatus] : "Pending",
      item.auditRemarks ?? "",
    ]);
  }
  sheet.addRow([]);
  sheet.addRow(
    scoreRow("Total", run.score).map((v, i) => (i === 0 ? "Complied / Not complied / NA / Items / Score" : v)),
  ).font = { bold: true };
  sheet.columns = [
    { width: 12 },
    { width: 24 },
    { width: 12 },
    { width: 60 },
    { width: 12 },
    { width: 14 },
    { width: 50 },
  ];
  sheet.getColumn(4).alignment = { wrapText: true, vertical: "top" };
  sheet.getColumn(7).alignment = { wrapText: true, vertical: "top" };
  await download(wb, `Audit_Report_${run.code}.xlsx`);
}
