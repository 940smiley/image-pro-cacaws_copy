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
 * Creates an eBay listing using the eBay API
 * @param listingData The listing data to create
 * @returns The eBay listing response
 */
export const createEbayListing = async (listingData: EbayListingRequest): Promise<EbayListingResponse> => {
  // In a real implementation, we would use the eBay API to create a listing
  // For this implementation, we'll simulate the API call
  
  // Get eBay API credentials from environment
  const ebayAppId = import.meta.env.VITE_EBAY_APP_ID;
  const ebayCertId = import.meta.env.VITE_EBAY_CERT_ID;
  const ebayAuthToken = import.meta.env.VITE_EBAY_AUTH_TOKEN;
  
  if (!ebayAppId || !ebayCertId || !ebayAuthToken) {
    throw new Error('eBay API credentials not configured');
  }
  
  // Construct the request body for eBay's Sell API
  const requestBody = {
    "listing": {
      "item": {
        "product": {
          "title": listingData.title,
          "description": listingData.description,
          "condition": listingData.condition,
          "category": {
            "categoryId": listingData.category
          },
          "additionalImages": listingData.imageUrls.map(url => ({
            "image": { "imageUrl": url }
          }))
        },
        "primaryCategory": {
          "categoryId": listingData.category
        },
        "conditionId": getEbayConditionId(listingData.condition),
        "description": listingData.description,
        "bestOfferEnabled": listingData.bestOfferEnabled || false,
        "buyItNowPrice": {
          "value": listingData.price.toString(),
          "currency": "USD"
        },
        "quantity": listingData.quantity,
        "sku": generateSku(listingData.title),
        "location": {
          "country": "US",
          "postalCode": "95125"
        },
        "shippingPackageDetails": {
          "dimensions": {
            "height": {
              "value": 2,
              "unit": "INCH"
            },
            "length": {
              "value": 8,
              "unit": "INCH"
            },
            "width": {
              "value": 10,
              "unit": "INCH"
            }
          },
          "packageType": "LETTER",
          "weight": {
            "value": 0.5,
            "unit": "POUND"
          }
        },
        "pickupOptions": [
          {
            "pickupOption": "PICKUP_DROP_OFF"
          }
        ],
        "returnsAccepted": true,
        "returnInstructions": listingData.returnPolicy || "Item must be returned in same condition as sent",
        "returnPeriod": {
          "value": 30,
          "unit": "DAY"
        },
        "shippingCostPaidBy": "BUYER",
        "shipToLocations": [
          "US"
        ],
        "shippingOptions": [
          {
            "shippingServiceCode": "USPS Ground Advantage",
            "shippingCostType": "FIXED",
            "additionalShippingCostPerUnit": {
              "value": 0,
              "currency": "USD"
            },
            "shippingCost": {
              "value": listingData.shippingCost || 0,
              "currency": "USD"
            }
          }
        ]
      },
      "format": "AUCTION",
      "listingDuration": "GTC",
      "pricingSummary": {
        "minimumReservePrice": {
          "value": (listingData.price * 0.8).toString(),
          "currency": "USD"
        }
      },
      "motorsGermany": {
        "priceType": "FIXED_PRICE"
      }
    }
  };
  
  // Simulate API call - in a real implementation, we would make the actual API call
  console.log('Creating eBay listing with data:', requestBody);
  
  // Return a mock response
  return {
    itemId: `1${Math.floor(Math.random() * 1000000000).toString().padStart(11, '0')}`,
    listingStatus: 'Active',
    fees: {
      listingFee: 0.35,
      finalValueFee: listingData.price * 0.135
    },
    itemUrl: `https://www.ebay.com/itm/${Math.floor(Math.random() * 1000000000)}`
  };
};

/**
 * Gets the eBay condition ID based on the condition string
 * @param condition The condition string
 * @returns The eBay condition ID
 */
const getEbayConditionId = (condition: string): number => {
  const conditionMap: Record<string, number> = {
    'New': 1000,
    'New with tags': 1500,
    'New without tags': 1750,
    'New with defects': 2000,
    'Manufacturer refurbished': 2250,
    'Seller refurbished': 2500,
    'Like New': 2750,
    'Very Good': 3000,
    'Good': 4000,
    'Acceptable': 5000,
    'Used': 3000, // Default to Very Good for Used
    'For parts or not working': 7000
  };
  
  return conditionMap[condition] || 3000; // Default to Very Good
};

/**
 * Generates a SKU based on the title
 * @param title The item title
 * @returns A generated SKU
 */
const generateSku = (title: string): string => {
  // Create a simple SKU from the title
  return title
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 20)
    .toUpperCase();
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