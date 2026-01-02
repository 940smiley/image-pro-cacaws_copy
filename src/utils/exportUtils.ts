import { ProcessingResult, ImageFile } from '../types';
import { createMetadataObject } from './metadataHandler';
import { write, utils } from 'xlsx';
import { PDFDocument, rgb } from 'pdf-lib';
import JSZip from 'jszip';

/**
 * Exports processing results as JSON
 * @param results Array of processing results
 * @returns JSON string
 */
export const exportToJson = (results: ProcessingResult[]): string => {
  return JSON.stringify(results, null, 2);
};

/**
 * Exports processing results as CSV (eBay format)
 * @param results Array of processing results
 * @returns CSV string
 */
export const exportToCsv = (results: ProcessingResult[]): string => {
  // Create eBay-compatible CSV headers
  const headers = [
    'Title',
    'Subtitle',
    'Description',
    'Primary Category',
    'Secondary Category',
    'Store Category',
    'Store Category 2',
    'Condition',
    'Condition Description',
    'Brand',
    'Type',
    'Size',
    'Color',
    'Material',
    'Year',
    'Genre',
    'Theme',
    'Features',
    'Country/Region of Manufacture',
    'MPN',
    'Model',
    'Size Type',
    'Department',
    'Style',
    'ISBN',
    'UPC',
    'EAN',
    'ISBN/EAN/UPC',
    'ISBN/EAN/UPC Exemption',
    'Quantity',
    'Duration',
    'Start Price',
    'Reserve Price',
    'Buy It Now Price',
    'Best Offer',
    'Best Offer Accept',
    'Best Offer Decline',
    'Shipping Type',
    'Shipping Cost',
    'Shipping Additional Cost',
    'Shipping Service',
    'Shipping Service Additional Cost',
    'Shipping Service Priority',
    'Shipping Package',
    'Shipping Weight',
    'Shipping Length',
    'Shipping Width',
    'Shipping Height',
    'Shipping International Service',
    'Shipping Insurance',
    'Shipping Insurance Fee',
    'Return Accepted',
    'Return Period',
    'Return Description',
    'Return Shipping Paid By',
    'Return Admin Fee',
    'International Return Accepted',
    'International Return Period',
    'International Return Shipping Paid By',
    'International Return Admin Fee',
    'Shipping Location',
    'International Shipping Service',
    'International Shipping Cost',
    'International Shipping Additional Cost',
    'PayPal Accept',
    'PayPal Email',
    'PayPal Immediate Payment',
    'Charity',
    'Charity Name',
    'Charity Percentage',
    'Charity ID',
    'Charity Donation',
    'Gallery Type',
    'Gallery Featured',
    'Bold Title',
    'Digital Delivery',
    'Digital Delivery Type',
    'Digital Delivery Resale',
    'Digital Delivery Use Limit',
    'Digital Delivery Expire',
    'Digital Delivery Terms',
    'Digital Delivery Delivery Time',
    'Digital Delivery Delivery Method',
    'Digital Delivery Delivery Frequency',
    'Digital Delivery Delivery Format',
    'Digital Delivery Delivery Access',
    'Digital Delivery Delivery Rights',
    'Digital Delivery Delivery Restrictions',
    'Digital Delivery Delivery Requirements',
    'Digital Delivery Delivery Limitations',
    'Digital Delivery Delivery Terms URL',
    'Digital Delivery Delivery Instructions',
    'Digital Delivery Delivery Notes',
    'Digital Delivery Delivery Contact',
    'Digital Delivery Delivery Support',
    'Digital Delivery Delivery Guarantee',
    'Digital Delivery Delivery Warranty',
    'Digital Delivery Delivery Service',
    'Digital Delivery Delivery Provider',
    'Digital Delivery Delivery Platform',
    'Digital Delivery Delivery Format Type',
    'Digital Delivery Delivery Format Version',
    'Digital Delivery Delivery Format Compatibility',
    'Digital Delivery Delivery Format Requirements',
    'Digital Delivery Delivery Format Limitations',
    'Digital Delivery Delivery Format Notes',
    'Digital Delivery Delivery Format Instructions',
    'Digital Delivery Delivery Format Support',
    'Digital Delivery Delivery Format Guarantee',
    'Digital Delivery Delivery Format Warranty',
    'Digital Delivery Delivery Format Service',
    'Digital Delivery Delivery Format Provider',
    'Digital Delivery Delivery Format Platform',
    'Digital Delivery Delivery Format Type',
    'Digital Delivery Delivery Format Version',
    'Digital Delivery Delivery Format Compatibility',
    'Digital Delivery Delivery Format Requirements',
    'Digital Delivery Delivery Format Limitations',
    'Digital Delivery Delivery Format Notes',
    'Digital Delivery Delivery Format Instructions',
    'Digital Delivery Delivery Format Support',
    'Digital Delivery Delivery Format Guarantee',
    'Digital Delivery Delivery Format Warranty',
    'Digital Delivery Delivery Format Service',
    'Digital Delivery Delivery Format Provider',
    'Digital Delivery Delivery Format Platform'
  ];

  // Create CSV content
  let csvContent = headers.join(',') + '\n';

  results.forEach(result => {
    // Create row data based on the result
    const row = [
      result.newFilename.replace(/,/g, ''), // Title
      '', // Subtitle
      result.analysis.description.replace(/,/g, ''), // Description
      'Collectibles', // Primary Category
      result.analysis.collectibleDetails?.type || '', // Secondary Category
      '', // Store Category
      '', // Store Category 2
      result.analysis.collectibleDetails?.condition || 'Used', // Condition
      result.analysis.conditionAssessment?.replace(/,/g, '') || '', // Condition Description
      '', // Brand
      result.analysis.collectibleDetails?.type || '', // Type
      '', // Size
      result.analysis.colors.join(' ').replace(/,/g, ''), // Color
      '', // Material
      result.analysis.collectibleDetails?.year || '', // Year
      '', // Genre
      '', // Theme
      result.analysis.collectibleDetails?.specialFeatures?.join(' ').replace(/,/g, '') || '', // Features
      result.analysis.collectibleDetails?.country || '', // Country/Region of Manufacture
      '', // MPN
      '', // Model
      '', // Size Type
      '', // Department
      '', // Style
      '', // ISBN
      '', // UPC
      '', // EAN
      '', // ISBN/EAN/UPC
      'No', // ISBN/EAN/UPC Exemption
      '1', // Quantity
      'GTC', // Duration
      result.analysis.estimatedValueRange?.min || '10.00', // Start Price
      '', // Reserve Price
      result.analysis.estimatedValueRange?.max || '', // Buy It Now Price
      'Yes', // Best Offer
      '', // Best Offer Accept
      '', // Best Offer Decline
      'Flat', // Shipping Type
      '0.00', // Shipping Cost
      '0.00', // Shipping Additional Cost
      'USPS Ground Advantage', // Shipping Service
      '0.00', // Shipping Service Additional Cost
      '1', // Shipping Service Priority
      'Package', // Shipping Package
      '0.5', // Shipping Weight
      '8', // Shipping Length
      '10', // Shipping Width
      '2', // Shipping Height
      'USPS First Class Package International', // Shipping International Service
      'No', // Shipping Insurance
      '0.00', // Shipping Insurance Fee
      'Yes', // Return Accepted
      '30 Days', // Return Period
      'Item must be returned in same condition as sent', // Return Description
      'Buyer', // Return Shipping Paid By
      'No', // Return Admin Fee
      'Yes', // International Return Accepted
      '30 Days', // International Return Period
      'Buyer', // International Return Shipping Paid By
      'No', // International Return Admin Fee
      'Worldwide', // Shipping Location
      'USPS First Class Package International', // International Shipping Service
      '5.00', // International Shipping Cost
      '0.00', // International Shipping Additional Cost
      'Yes', // PayPal Accept
      '', // PayPal Email
      'Yes', // PayPal Immediate Payment
      'No', // Charity
      '', // Charity Name
      '', // Charity Percentage
      '', // Charity ID
      'No', // Charity Donation
      'Standard', // Gallery Type
      'No', // Gallery Featured
      'No', // Bold Title
      'No', // Digital Delivery
    ].map(field => `"${field}"`).join(',');

    csvContent += row + '\n';
  });

  return csvContent;
};

/**
 * Exports processing results as XLSX (Excel)
 * @param results Array of processing results
 * @param images Array of image files
 * @returns XLSX file as Blob
 */
export const exportToXlsx = async (results: ProcessingResult[]): Promise<Blob> => {
  // Create a workbook
  const wb = utils.book_new();

  // Create a worksheet with results data
  const wsData = [
    ['ID', 'Original Filename', 'New Filename', 'Description', 'Objects', 'Categories', 'Colors', 'Condition', 'Estimated Value', 'Analysis Confidence']
  ];

  results.forEach(result => {
    wsData.push([
      result.id,
      result.originalFilename,
      result.newFilename,
      result.analysis.description,
      result.analysis.objects.join('; '),
      result.analysis.categories.join('; '),
      result.analysis.colors.join('; '),
      result.analysis.collectibleDetails?.condition || 'N/A',
      result.analysis.estimatedValueRange ? `${result.analysis.estimatedValueRange.min}-${result.analysis.estimatedValueRange.max}` : 'N/A',
      String(result.analysis.confidence)
    ]);
  });

  const ws = utils.aoa_to_sheet(wsData);
  utils.book_append_sheet(wb, ws, 'Results');

  // Create another sheet for image metadata
  const metadataWsData = [
    ['Filename', 'Metadata Key', 'Metadata Value']
  ];

  results.forEach(result => {
    const metadata = createMetadataObject(result.analysis, result.operations, result.originalFilename);
    Object.entries(metadata).forEach(([key, value]) => {
      metadataWsData.push([result.newFilename, key, String(value)]);
    });
  });

  const metadataWs = utils.aoa_to_sheet(metadataWsData);
  utils.book_append_sheet(wb, metadataWs, 'Metadata');

  // Write the workbook and return as blob
  const wbout = write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/**
 * Exports processing results as PDF
 * @param results Array of processing results
 * @param images Array of image files
 * @returns PDF as Blob
 */
export const exportToPdf = async (results: ProcessingResult[]): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();

  for (const result of results) {
    // Add a new page for each result
    const page = pdfDoc.addPage([595, 842]); // A4 size in points
    const { height } = page.getSize();
    const fontSize = 12;

    // Add title
    page.drawText(`Image: ${result.newFilename}`, {
      x: 50,
      y: height - 50,
      size: 16,
      color: rgb(0, 0, 0),
    });

    // Add description
    page.drawText(`Description: ${result.analysis.description}`, {
      x: 50,
      y: height - 80,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    // Add objects identified
    page.drawText(`Objects: ${result.analysis.objects.join(', ')}`, {
      x: 50,
      y: height - 100,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    // Add categories
    page.drawText(`Categories: ${result.analysis.categories.join(', ')}`, {
      x: 50,
      y: height - 120,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    // Add colors
    page.drawText(`Colors: ${result.analysis.colors.join(', ')}`, {
      x: 50,
      y: height - 140,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    // Add collectible details if available
    if (result.analysis.collectibleDetails) {
      const details = result.analysis.collectibleDetails;
      let yPos = height - 170;

      page.drawText(`Collectible Type: ${details.type}`, {
        x: 50,
        y: yPos,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      yPos -= 20;

      if (details.era) {
        page.drawText(`Era: ${details.era}`, {
          x: 50,
          y: yPos,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
        yPos -= 20;
      }

      if (details.country) {
        page.drawText(`Country: ${details.country}`, {
          x: 50,
          y: yPos,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
        yPos -= 20;
      }

      if (details.year) {
        page.drawText(`Year: ${details.year}`, {
          x: 50,
          y: yPos,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
        yPos -= 20;
      }

      if (details.condition) {
        page.drawText(`Condition: ${details.condition}`, {
          x: 50,
          y: yPos,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
        yPos -= 20;
      }

      if (details.rarity) {
        page.drawText(`Rarity: ${details.rarity}`, {
          x: 50,
          y: yPos,
          size: fontSize,
          color: rgb(0, 0, 0),
        });
        yPos -= 20;
      }

      page.drawText(`Estimated Value: $${details.estimatedValue}`, {
        x: 50,
        y: yPos,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      yPos -= 20;
    }

    // Add condition assessment
    if (result.analysis.conditionAssessment) {
      page.drawText(`Condition Assessment: ${result.analysis.conditionAssessment}`, {
        x: 50,
        y: height - 250,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
    }

    // Add estimated value range
    if (result.analysis.estimatedValueRange) {
      const { min, max } = result.analysis.estimatedValueRange;
      page.drawText(`Estimated Value Range: $${min} - $${max}`, {
        x: 50,
        y: height - 270,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
    }

    // Add confidence
    page.drawText(`Analysis Confidence: ${result.analysis.confidence}%`, {
      x: 50,
      y: height - 290,
      size: fontSize,
      color: rgb(0, 0, 0),
    });

    // Add processing operations
    const operations = result.operations.map(op => `${op.type}: ${JSON.stringify(op.params)}`).join(', ');
    page.drawText(`Processing Operations: ${operations}`, {
      x: 50,
      y: height - 310,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
  }

  // Serialize the PDF and return as blob
  const pdfBytes = await pdfDoc.save();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
};

/**
 * Exports all results in a ZIP file containing JSON, PDF, CSV, and XLSX
 * @param results Array of processing results
 * @param images Array of image files
 * @returns ZIP file as Blob
 */
export const exportAll = async (results: ProcessingResult[], images: ImageFile[]): Promise<Blob> => {
  const zip = new JSZip();

  // Add JSON export
  const jsonContent = exportToJson(results);
  zip.file('results.json', jsonContent);

  // Add CSV export
  const csvContent = exportToCsv(results);
  zip.file('results.csv', csvContent);

  // Add XLSX export
  const xlsxBlob = await exportToXlsx(results);
  zip.file('results.xlsx', xlsxBlob);

  // Add PDF export
  const pdfBlob = await exportToPdf(results);
  zip.file('results.pdf', pdfBlob);

  // Add processed images
  const imagesFolder = zip.folder('processed_images');
  if (imagesFolder) {
    for (const image of images) {
      if (image.result) {
        // Get the blob from the image URL
        const response = await fetch(image.result);
        const blob = await response.blob();
        imagesFolder.file(image.file.name, blob);
      }
    }
  }

  // Generate the zip file
  const zipContent = await zip.generateAsync({ type: 'blob' });
  return zipContent;
};