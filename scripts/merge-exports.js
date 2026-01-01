import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

/**
 * Utility to merge multiple Image Pro export files (PDF, CSV, JSON)
 */

const mergePdfs = async (inputPaths, outputPath) => {
  const mergedPdf = await PDFDocument.create();
  for (const filePath of inputPaths) {
    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  const mergedPdfBytes = await mergedPdf.save();
  fs.writeFileSync(outputPath, mergedPdfBytes);
  console.log(`Successfully merged ${inputPaths.length} PDFs into ${outputPath}`);
};

const mergeCsvs = (inputPaths, outputPath) => {
  let combinedContent = '';
  inputPaths.forEach((filePath, idx) => {
    const content = fs.readFileSync(filePath, 'utf8');
    if (idx === 0) {
      combinedContent = content;
    } else {
      // Skip header for subsequent files
      const lines = content.split('\n').slice(1);
      combinedContent += lines.join('\n');
    }
  });
  fs.writeFileSync(outputPath, combinedContent);
  console.log(`Successfully merged ${inputPaths.length} CSVs into ${outputPath}`);
};

const args = process.argv.slice(2);
const command = args[0];
const targetDir = args[1] || './exports';

if (!command) {
  console.log('Usage: node merge-exports.js <pdf|csv> <directory>');
  process.exit(0);
}

const files = fs.readdirSync(targetDir)
  .filter(f => f.endsWith(`.${command}`))
  .map(f => path.join(targetDir, f));

if (files.length < 2) {
  console.log('Need at least 2 files to merge.');
} else {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const output = path.join(targetDir, `merged-export-${timestamp}.${command}`);
  
  if (command === 'pdf') mergePdfs(files, output);
  else if (command === 'csv') mergeCsvs(files, output);
}
