import { supabase } from '../lib/supabase';
import { ProcessingResult } from '../types';

interface EbayListingRequest {
  title: string;
  description: string;
  category: string;
  price: number;
  condition: string;
  quantity: number;
  imageUrls: string[];
  subtitle?: string;
  brand?: string;
  type?: string;
  year?: string;
  material?: string;
  color?: string;
  size?: string;
  shippingType?: string;
  shippingCost?: number;
  returnPolicy?: string;
  bestOfferEnabled?: boolean;
}

interface EbayListingResponse {
  itemId: string;
  listingStatus: string;
  fees: {
    listingFee: number;
    finalValueFee: number;
  };
  itemUrl: string;
}

/**
 * Creates an eBay listing using the Supabase Edge Function
 * @param listingData The listing data to create
 * @returns The eBay listing response
 */
export const createEbayListing = async (listingData: EbayListingRequest): Promise<EbayListingResponse> => {
  const { data, error } = await supabase.functions.invoke('ebay-create-listing', {
    body: listingData
  });

  if (error) {
    throw new Error(`Failed to create eBay listing: ${error.message}`);
  }

  return data as EbayListingResponse;
};

/**
 * Creates eBay listings from processing results
 * @param results Array of processing results
 * @returns Array of eBay listing responses
 */
export const createEbayListingsFromResults = async (results: ProcessingResult[]): Promise<EbayListingResponse[]> => {
  const responses: EbayListingResponse[] = [];
  
  for (const result of results) {
    // Create listing data from the processing result
    const listingData: EbayListingRequest = {
      title: result.newFilename,
      description: result.analysis.description,
      category: result.analysis.collectibleDetails?.type || 'Collectibles',
      price: result.analysis.estimatedValueRange?.min || 10,
      condition: result.analysis.collectibleDetails?.condition || 'Used',
      quantity: 1,
      imageUrls: [result.newFilename], // In a real implementation, we'd have actual image URLs
      year: result.analysis.collectibleDetails?.year,
      material: result.analysis.collectibleDetails?.specialFeatures?.join(', '),
      color: result.analysis.colors.join(', '),
      shippingCost: 5.00,
      returnPolicy: 'Item must be returned in same condition as sent',
      bestOfferEnabled: true
    };
    
    try {
      const response = await createEbayListing(listingData);
      responses.push(response);
    } catch (error) {
      console.error(`Failed to create listing for ${result.newFilename}:`, error);
    }
  }
  
  return responses;
};