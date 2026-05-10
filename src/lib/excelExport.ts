import ExcelJS from 'exceljs';
import { toEnglishNumbers } from './numberUtils';

// ARGB-encoded brand palette. CSS source-of-truth lives in src/theme/tokens.ts
// (re-typed here because exceljs needs 'FFRRGGBB' not '#RRGGBB').
const BRAND = {
  navy:          'FF1E3A5F',
  primary:       'FF2563EB',
  primaryLight:  'FF3B82F6',
  textPrimary:   'FF1E293B',
  textSecondary: 'FF64748B',
  textBody:      'FF334155',
  rowAlt:        'FFF8FAFC',
  rowMain:       'FFFFFFFF',
  borderLight:   'FFE2E8F0',
  white:         'FFFFFFFF',
};

const STATUS = {
  active:    { fill: 'FFD1FAE5', text: 'FF065F46' },
  paid:      { fill: 'FFD1FAE5', text: 'FF065F46' },
  success:   { fill: 'FFD1FAE5', text: 'FF065F46' },
  approved:  { fill: 'FFEFF6FF', text: 'FF1D4ED8' },
  info:      { fill: 'FFEFF6FF', text: 'FF1D4ED8' },
  pending:   { fill: 'FFFEF3C7', text: 'FF92400E' },
  warning:   { fill: 'FFFEF3C7', text: 'FF92400E' },
  partial:   { fill: 'FFFEF3C7', text: 'FF92400E' },
  blocked:   { fill: 'FFFEE2E2', text: 'FF991B1B' },
  rejected:  { fill: 'FFFEE2E2', text: 'FF991B1B' },
  error:     { fill: 'FFFEE2E2', text: 'FF991B1B' },
  inactive:  { fill: 'FFF1F5F9', text: 'FF475569' },
  cancelled: { fill: 'FFF1F5F9', text: 'FF475569' },
  neutral:   { fill: 'FFF1F5F9', text: 'FF475569' },
} as const;

export type StatusKey = keyof typeof STATUS;

export interface BrandedColumn {
  key: string;
  label: string;
  width: number;
}

export interface BrandedWorkbookOpts {
  title: string;
  subtitle?: string;
  sheetName?: string;
  columns: BrandedColumn[];
}

export interface BrandedWorkbook {
  wb: ExcelJS.Workbook;
  ws: ExcelJS.Worksheet;
  headerRowIdx: number;
  dataStartRow: number;
  columns: BrandedColumn[];
}

let logoCache: { buffer: ArrayBuffer; ext: 'png' } | null | undefined;

const loadLogo = async (): Promise<{ buffer: ArrayBuffer; ext: 'png' } | null> => {
  if (logoCache !== undefined) return logoCache;
  try {
    const res = await fetch('/assets/logo-blue.png');
    if (!res.ok) throw new Error('logo fetch ' + res.status);
    const buffer = await res.arrayBuffer();
    logoCache = { buffer, ext: 'png' };
    return logoCache;
  } catch {
    logoCache = null;
    return null;
  }
};

export const createBrandedWorkbook = async (opts: BrandedWorkbookOpts): Promise<BrandedWorkbook> => {
  const { title, subtitle, columns } = opts;
  const sheetName = opts.sheetName || 'Sheet1';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Half Lens';
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 5, rightToLeft: true }],
    properties: { defaultRowHeight: 22 },
  });

  ws.columns = columns.map(c => ({ key: c.key, width: c.width }));

  const lastColLetter = ws.getColumn(columns.length).letter;

  // Row 1 — title (logo overlays cells A1:B1 if available).
  ws.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Cairo', size: 22, bold: true, color: { argb: BRAND.textPrimary } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
  ws.getRow(1).height = 50;

  const logo = await loadLogo();
  if (logo) {
    const imgId = wb.addImage({ buffer: logo.buffer, extension: logo.ext });
    ws.addImage(imgId, {
      tl: { col: 0.15, row: 0.15 },
      ext: { width: 90, height: 38 },
      editAs: 'oneCell',
    });
  }

  // Row 2 — subtitle (date / count summary).
  ws.mergeCells(`A2:${lastColLetter}2`);
  const subCell = ws.getCell('A2');
  subCell.value = subtitle || '';
  subCell.font = { name: 'Cairo', size: 11, color: { argb: BRAND.textSecondary } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' };
  ws.getRow(2).height = 22;

  // Row 3 — decorative bar.
  ws.mergeCells(`A3:${lastColLetter}3`);
  const ruleCell = ws.getCell('A3');
  ruleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.primaryLight } };
  ws.getRow(3).height = 4;

  // Row 4 — spacer.
  ws.getRow(4).height = 8;

  return { wb, ws, headerRowIdx: 5, dataStartRow: 6, columns };
};

export const applyHeaderRow = (ws: ExcelJS.Worksheet, rowIdx: number, labels: string[]) => {
  const row = ws.getRow(rowIdx);
  labels.forEach((label, i) => {
    const cell = row.getCell(i + 1);
    cell.value = label;
    cell.font = { name: 'Cairo', size: 12, bold: true, color: { argb: BRAND.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.navy } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
    cell.border = {
      top:    { style: 'thin', color: { argb: BRAND.navy } },
      bottom: { style: 'thin', color: { argb: BRAND.navy } },
      left:   { style: 'thin', color: { argb: BRAND.navy } },
      right:  { style: 'thin', color: { argb: BRAND.navy } },
    };
  });
  row.height = 30;
};

export const applyDataRow = (
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  colCount: number,
  isAlt: boolean,
  opts: { numberCols?: number[] } = {},
) => {
  const row = ws.getRow(rowIdx);
  const numberCols = new Set(opts.numberCols || []);
  const fill = isAlt ? BRAND.rowAlt : BRAND.rowMain;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { name: 'Cairo', size: 11, color: { argb: BRAND.textBody } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
      readingOrder: numberCols.has(c) ? 'ltr' : 'rtl',
    };
    cell.border = {
      top:    { style: 'thin', color: { argb: BRAND.borderLight } },
      bottom: { style: 'thin', color: { argb: BRAND.borderLight } },
      left:   { style: 'thin', color: { argb: BRAND.borderLight } },
      right:  { style: 'thin', color: { argb: BRAND.borderLight } },
    };
  }
  row.height = 26;
};

export const applyStatusBadge = (cell: ExcelJS.Cell, statusKey: StatusKey, label: string) => {
  const palette = STATUS[statusKey] || STATUS.neutral;
  cell.value = label;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.fill } };
  cell.font = { name: 'Cairo', size: 11, bold: true, color: { argb: palette.text } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
};

export const applyTotalsRow = (
  ws: ExcelJS.Worksheet,
  rowIdx: number,
  colCount: number,
  totals: Record<number, string | number>,
  leadLabel?: string,
) => {
  const row = ws.getRow(rowIdx);
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { name: 'Cairo', size: 12, bold: true, color: { argb: BRAND.textPrimary } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.rowAlt } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, readingOrder: 'rtl' };
    cell.border = {
      top:    { style: 'medium', color: { argb: BRAND.navy } },
      bottom: { style: 'thin',   color: { argb: BRAND.borderLight } },
      left:   { style: 'thin',   color: { argb: BRAND.borderLight } },
      right:  { style: 'thin',   color: { argb: BRAND.borderLight } },
    };
    if (c === 1 && leadLabel) cell.value = leadLabel;
    if (totals[c] !== undefined) cell.value = totals[c];
  }
  row.height = 28;
};

export interface TableFinishOpts {
  firstDataRow: number;
  lastDataRow: number;
  firstCol: number;
  lastCol: number;
  autoFilter?: boolean;
  freezeFirstCol?: boolean;
  outerBorder?: boolean;
}

export const applyTableFinish = (ws: ExcelJS.Worksheet, opts: TableFinishOpts) => {
  const { firstDataRow, lastDataRow, firstCol, lastCol } = opts;
  const headerRow = firstDataRow - 1;

  if (opts.autoFilter && lastDataRow >= firstDataRow) {
    ws.autoFilter = {
      from: { row: headerRow, column: firstCol },
      to:   { row: lastDataRow, column: lastCol },
    };
  }

  if (opts.freezeFirstCol) {
    const view = ws.views?.[0] as { xSplit?: number } | undefined;
    if (view) view.xSplit = firstCol;
  }

  if (opts.outerBorder && lastDataRow >= headerRow) {
    const medium = { style: 'medium' as const, color: { argb: BRAND.navy } };
    for (let r = headerRow; r <= lastDataRow; r++) {
      const left = ws.getRow(r).getCell(firstCol);
      left.border = { ...left.border, left: medium };
      const right = ws.getRow(r).getCell(lastCol);
      right.border = { ...right.border, right: medium };
    }
    for (let c = firstCol; c <= lastCol; c++) {
      const top = ws.getRow(headerRow).getCell(c);
      top.border = { ...top.border, top: medium };
      const bottom = ws.getRow(lastDataRow).getCell(c);
      bottom.border = { ...bottom.border, bottom: medium };
    }
  }
};

export const formatPhoneCell = (cell: ExcelJS.Cell, phone: string) => {
  cell.value = phone ? toEnglishNumbers(phone) : '-';
  cell.alignment = { ...(cell.alignment || {}), readingOrder: 'ltr' };
};

export const formatNumberCell = (cell: ExcelJS.Cell, n: number, decimals = 2) => {
  cell.value = Number.isFinite(n) ? n : 0;
  cell.numFmt = decimals === 0 ? '#,##0' : `#,##0.${'0'.repeat(decimals)}`;
  cell.alignment = { ...(cell.alignment || {}), readingOrder: 'ltr', horizontal: 'center' };
};

export const formatCurrencyCell = (cell: ExcelJS.Cell, n: number, currency: string = 'SAR') => {
  cell.value = Number.isFinite(n) ? n : 0;
  cell.numFmt = currency === 'USD'
    ? '"$"#,##0.00'
    : currency === 'EUR'
      ? '"€"#,##0.00'
      : '#,##0.00 "ر.س"';
  cell.alignment = { ...(cell.alignment || {}), readingOrder: 'ltr', horizontal: 'center' };
};

export const formatPercentCell = (cell: ExcelJS.Cell, n: number, decimals = 0) => {
  cell.value = Number.isFinite(n) ? n : 0;
  cell.numFmt = decimals === 0 ? '0"%"' : `0.${'0'.repeat(decimals)}"%"`;
  cell.alignment = { ...(cell.alignment || {}), readingOrder: 'ltr', horizontal: 'center' };
};

export const formatDateCell = (cell: ExcelJS.Cell, iso: string | null | undefined) => {
  if (!iso) {
    cell.value = '-';
    return;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    cell.value = iso;
    return;
  }
  cell.value = d;
  cell.numFmt = 'yyyy-mm-dd';
  cell.alignment = { ...(cell.alignment || {}), readingOrder: 'ltr', horizontal: 'center' };
};

export const downloadWorkbook = async (wb: ExcelJS.Workbook, filename: string) => {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};
