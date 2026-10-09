import * as XLSX from 'xlsx';
import { todayPH } from '@/utils/dateUtils';

export interface ExportData {
  headers: string[];
  rows: (string | number | boolean | null)[][];
  filename: string;
  sheetName?: string;
}

export const exportToExcel = (data: ExportData) => {
  const { headers, rows, filename, sheetName = 'Data' } = data;

  // Create workbook with data
  const ws_data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Set column widths
  const colWidths = headers.map((header) => ({
    wch: Math.max(header.length, 15),
  }));
  ws['!cols'] = colWidths;

  // Style header row
  for (let i = 0; i < headers.length; i++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = {
      fill: { fgColor: { rgb: 'FF1F2937' } }, // Slate-900
      font: { bold: true, color: { rgb: 'FFFFFFFF' } }, // White text
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate filename with date
  const date = todayPH();
  const fullFilename = `${filename}-${date}.xlsx`;

  // Download file
  XLSX.writeFile(wb, fullFilename);
};

export const exportMultipleSheets = (
  data: Array<{
    headers: string[];
    rows: (string | number | boolean | null)[][];
    sheetName: string;
  }>,
  filename: string
) => {
  const wb = XLSX.utils.book_new();

  data.forEach(({ headers, rows, sheetName }) => {
    const ws_data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    const colWidths = headers.map((header) => ({
      wch: Math.max(header.length, 15),
    }));
    ws['!cols'] = colWidths;

    // Style header row
    for (let i = 0; i < headers.length; i++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: i });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        fill: { fgColor: { rgb: 'FF1F2937' } },
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const date = todayPH();
  const fullFilename = `${filename}-${date}.xlsx`;
  XLSX.writeFile(wb, fullFilename);
};
