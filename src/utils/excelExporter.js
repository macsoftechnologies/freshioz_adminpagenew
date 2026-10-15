// Freshioz Excel & CSV Export Utility
// Generates Microsoft Excel and Google Sheets compatible spreadsheets with UTF-8 BOM encoding

export function exportToExcel(filenamePrefix, headers, rows) {
  // UTF-8 BOM so Excel properly opens international characters and currencies
  const BOM = '\uFEFF';

  const formatCell = (val) => {
    if (val === null || val === undefined) return '""';
    const stringVal = String(val).replace(/"/g, '""');
    return `"${stringVal}"`;
  };

  const headerRow = headers.map(formatCell).join(',');
  const dataRows = rows.map(row => row.map(formatCell).join(','));
  const csvContent = [headerRow, ...dataRows].join('\r\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${timestamp}.csv`);
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
