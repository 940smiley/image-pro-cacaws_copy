export interface UserSettings {
  id: string;
  user_id: string;
  auto_enhance: boolean;
  expand_before_crop: boolean;
  expansion_percentage: number;
  theme: string;
  show_grid: boolean;
  show_tips: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProcessingHistory {
  id: string;
  user_id: string | null;
  original_filename: string;
  processed_count: number;
  operations: ProcessingOperation[];
  created_at: string;
}

export interface ProcessingOperation {
  type: 'expand' | 'crop' | 'enhance' | 'resize' | 'rotate';
  params: Record<string, number | string | boolean>;
  timestamp: string;
}

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: string;
  operations: ProcessingOperation[];
  error?: string;
  geminiAnalysis?: GeminiAnalysis;
  ebayData?: EbayPricingData;
  isDuplicate?: boolean;
  hash?: string;
  localAnalysis?: {
    hasObject: boolean;
    confidence: number;
    possibleType: string;
    summary?: string;
  };
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollectibleDetails {
  type: string; // stamp, trading card, postcard, letter, etc.
  era: string;
  country?: string;
  year?: string;
  denomination?: string;
  condition: string;
  rarity: string;
  estimatedValue: number;
  authentication: string[];
  grading?: string;
  historicalSignificance?: string;
  specialFeatures?: string[];
}

export interface GeminiAnalysis {
  description: string;
  objects: string[];
  categories: string[];
  colors: string[];
  confidence: number;
  collectibleDetails?: CollectibleDetails;
  conditionAssessment?: string;
  authenticityMarkers?: string[];
  estimatedValueRange?: { min: number; max: number };
}

export interface EbayListing {
  itemId: string;
  title: string;
  currentPrice: string;
  condition: string;
  sellerInfo: {
    sellerUserName: string;
    feedbackRating: number;
  };
  listingStatus: string;
  endDate: string;
  itemUrl: string;
  imageUrl?: string;
}

export interface EbayPricingData {
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  listings: EbayListing[];
  searchQuery: string;
}

export interface ProcessingResult {
  id: string;
  originalFilename: string;
  newFilename: string;
  analysis: GeminiAnalysis;
  operations: ProcessingOperation[];
  metadata: Record<string, string | number | undefined>;
  exportFormats: {
    json?: string;
    pdf?: string;
    csv?: string;
    xlsx?: string;
  };
}
