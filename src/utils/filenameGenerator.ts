import { GeminiAnalysis } from '../types';

/**
 * Generates a smart filename based on Gemini analysis
 * @param originalFilename The original filename
 * @param analysis The Gemini analysis result
 * @returns A new filename based on the analysis
 */
export const generateSmartFilename = (originalFilename: string, analysis: GeminiAnalysis): string => {
  // Extract the file extension
  const fileExtension = originalFilename.split('.').pop() || 'jpg';
  
  // Create a base name based on the analysis
  let baseName = '';
  
  if (analysis.collectibleDetails) {
    // For collectibles, create a descriptive name
    const { type, year, country, denomination, condition } = analysis.collectibleDetails;
    
    // Build the name based on available details
    const parts = [];
    
    if (year) parts.push(year);
    if (country) parts.push(country);
    if (type) parts.push(type);
    if (denomination) parts.push(denomination);
    
    // Add description if available
    if (analysis.description) {
      // Clean the description to remove special characters
      const cleanDescription = analysis.description
        .replace(/[^\w\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50); // Limit length
      
      parts.push(cleanDescription);
    }
    
    baseName = parts.join(' ').replace(/\s+/g, ' ').trim();
  } else if (analysis.objects && analysis.objects.length > 0) {
    // For non-collectibles, use the main objects identified
    baseName = analysis.objects.slice(0, 3).join(' ').replace(/\s+/g, ' ').trim();
  } else {
    // Fallback to the original name with a prefix
    baseName = `analyzed-${originalFilename.replace(/\.[^/.]+$/, '')}`;
  }
  
  // Clean the base name to ensure it's a valid filename
  baseName = baseName
    .replace(/[<>:"/\\|?*]/g, ' ') // Replace invalid characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  // Limit the total length to avoid filesystem issues
  if (baseName.length > 100) {
    baseName = baseName.substring(0, 100).trim();
  }
  
  // Return the new filename with the original extension
  return `${baseName}.${fileExtension}`;
};

/**
 * Generates a filename specifically for collectibles with detailed information
 * @param originalFilename The original filename
 * @param analysis The Gemini analysis result
 * @returns A new filename based on the collectible details
 */
export const generateCollectibleFilename = (originalFilename: string, analysis: GeminiAnalysis): string => {
  const fileExtension = originalFilename.split('.').pop() || 'jpg';
  
  if (!analysis.collectibleDetails) {
    return generateSmartFilename(originalFilename, analysis);
  }
  
  const { type, year, country, denomination, condition, estimatedValue } = analysis.collectibleDetails;
  
  // Create a detailed name for collectibles
  const parts = [];
  
  if (year) parts.push(year);
  if (country) parts.push(country);
  if (type) parts.push(type);
  if (denomination) parts.push(denomination);
  
  // Add condition if available
  if (condition) {
    parts.push(`(${condition})`);
  }
  
  // Add estimated value range if available
  if (analysis.estimatedValueRange) {
    const { min, max } = analysis.estimatedValueRange;
    if (min > 0 || max > 0) {
      parts.push(`~$${min}-${max}`);
    }
  }
  
  // Add description if available
  if (analysis.description) {
    const cleanDescription = analysis.description
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 30);
    
    parts.push(cleanDescription);
  }
  
  let baseName = parts.join(' ').replace(/\s+/g, ' ').trim();
  
  // Clean the base name to ensure it's a valid filename
  baseName = baseName
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Limit the total length
  if (baseName.length > 100) {
    baseName = baseName.substring(0, 100).trim();
  }
  
  return `${baseName}.${fileExtension}`;
};