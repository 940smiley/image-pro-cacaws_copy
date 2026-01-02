import { GeminiAnalysis, ProcessingOperation } from '../types';

/**
 * Creates a metadata object from AI analysis and processing operations
 * @param analysis Gemini AI analysis results
 * @param operations List of processing operations applied
 * @param filename Original or new filename
 * @returns Object containing formatted metadata
 */
export const createMetadataObject = (
  analysis: GeminiAnalysis,
  operations: ProcessingOperation[],
  filename: string
): Record<string, string | number | undefined> => {
  const metadata: Record<string, string | number | undefined> = {
    'Processing Timestamp': new Date().toISOString(),
    'Image Filename': filename,
    'Software': 'Image Pro',
    'Analysis Confidence': analysis.confidence,
    'Source AI': 'Google Gemini',

    'Description': analysis.description,
    'Objects Identified': analysis.objects.join(', '),
    'Categories': analysis.categories.join(', '),
    'Colors': analysis.colors.join(', '),

    // Add collectible specific details if present
    ...(analysis.collectibleDetails && {
      'Collectible Type': analysis.collectibleDetails.type,
      'Era': analysis.collectibleDetails.era,
      'Country': analysis.collectibleDetails.country,
      'Year': analysis.collectibleDetails.year,
      'Denomination': analysis.collectibleDetails.denomination,
      'Condition': analysis.collectibleDetails.condition,
      'Rarity': analysis.collectibleDetails.rarity,
      'Estimated Value': analysis.collectibleDetails.estimatedValue,
      'Authentication Markers': analysis.collectibleDetails.authentication.join(', '),
      'Grading': analysis.collectibleDetails.grading,
      'Historical Significance': analysis.collectibleDetails.historicalSignificance,
      'Special Features': analysis.collectibleDetails.specialFeatures?.join(', '),
    }),

    // Condition assessment
    ...(analysis.conditionAssessment && { 'Condition Assessment': analysis.conditionAssessment }),
    ...(analysis.authenticityMarkers && { 'Authenticity Markers': analysis.authenticityMarkers.join(', ') }),

    // Estimated value range
    ...(analysis.estimatedValueRange && {
      'Estimated Value Min': analysis.estimatedValueRange.min,
      'Estimated Value Max': analysis.estimatedValueRange.max,
    }),

    // Record all operations applied to the image
    'Processing Operations': operations.map(op => `${op.type}: ${JSON.stringify(op.params)}`).join('; '),
  };

  return metadata;
};

/**
 * Extracts metadata from an image file (if any was embedded)
 * @param _imageBlob The image blob to extract metadata from
 * @returns Object containing metadata or null if none found
 */
export const extractMetadata = async (): Promise<Record<string, string | number> | null> => {
  // In a real implementation, we would use a library like exiftool-vendored (in Electron)
  // or a client-side library to read EXIF/IPTC metadata.
  // For this implementation, we'll return null as it's a complex client-side operation
  return null;
};
