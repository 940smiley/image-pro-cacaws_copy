import { GeminiAnalysis } from '../types';

/**
 * Generates a descriptive filename based on AI analysis
 */
export const generateSmartFilename = (originalName: string, analysis: GeminiAnalysis): string => {
  const extension = originalName.split('.').pop();
  
  if (analysis.objects && analysis.objects.length > 0) {
    // Use the first two identified objects
    const namePart = analysis.objects.slice(0, 2)
      .map(obj => obj.toLowerCase().replace(/[^a-z0-9]/g, '_'))
      .join('_');
    
    return `${namePart}_${Date.now()}.${extension}`;
  }
  
  return `processed_${originalName}`;
};

/**
 * Generates a filename specialized for collectibles
 */
export const generateCollectibleFilename = (originalName: string, analysis: GeminiAnalysis): string => {
  const extension = originalName.split('.').pop();
  
  if (analysis.collectibleDetails) {
    const { type, year, country, denomination, condition } = analysis.collectibleDetails;
    
    const parts = [];
    if (country) parts.push(country.toLowerCase().replace(/\s+/g, '_'));
    if (year) parts.push(year);
    if (denomination) parts.push(denomination.toLowerCase().replace(/\s+/g, '_'));
    if (type) parts.push(type.toLowerCase().replace(/\s+/g, '_'));
    
    const baseName = parts.length > 0 ? parts.join('_') : 'collectible';
    
    // Add condition if it's notable
    if (condition && condition.toLowerCase() !== 'unknown') {
      const safeCondition = condition.toLowerCase().replace(/[^a-z0-9]/g, '_');
      return `${baseName}_${safeCondition}.${extension}`;
    }
    
    return `${baseName}.${extension}`;
  }
  
  return generateSmartFilename(originalName, analysis);
};

/**
 * Creates a filename specifically for the "Source Connector" repo organization
 */
export const generateOrganizedFilename = (analysis: GeminiAnalysis, originalName: string): string => {
  const extension = originalName.split('.').pop();
  
  const parts = [];
  
  if (analysis.collectibleDetails) {
    const { type, year, country, denomination, condition: _condition, estimatedValue: _estimatedValue } = analysis.collectibleDetails;
    
    if (country) parts.push(country);
    if (year) parts.push(year);
    if (denomination) parts.push(denomination);
    if (type) parts.push(type);
    
  } else if (analysis.objects && analysis.objects.length > 0) {
    parts.push(analysis.objects[0]);
  }
  
  let baseName = parts.length > 0 ? parts.join(' ').replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'unidentified';
  
  // Add collectible-specific suffix if possible
  if (analysis.collectibleDetails) {
    const { condition } = analysis.collectibleDetails;
    if (condition) {
      parts.push(`(${condition})`);
    }
    baseName = parts.join(' ').replace(/[^a-z0-9()]/gi, '_').toLowerCase();
  }
  
  return `${baseName}_${Date.now()}.${extension}`;
};
