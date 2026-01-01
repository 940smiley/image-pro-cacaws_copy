interface Resource {
  title: string;
  type: 'pdf' | 'txt' | 'html';
  content: string;
}

export class StampResourcePreprocessor {
  private resources: Resource[] = [];
  private initialized = false;

  constructor() {
    // Initialize with some default stamp knowledge
    this.initializeDefaultKnowledge();
  }

  private initializeDefaultKnowledge(): void {
    // Add default knowledge about stamp identification
    this.resources.push({
      title: "Stamp Identification Guidelines",
      type: "txt",
      content: `
# Key Features for Stamp Identification:

## Country of Origin
- Look for the country name, often in local language
- Some countries use country codes (e.g., "USA", "GB")
- Countries without names typically use symbols or coats of arms

## Perforations
- Count the perforations per 2cm (mesh gauge)
- Check if perforations are regular, irregular, or missing
- Position and shape of perforations can be important

## Watermarks
- Hold the stamp up to light to reveal watermarks
- Common watermarks: Crown, letters, symbols
- Specialized fluids can make watermarks more visible

## Paper Types
- Common: Wove paper, Laid paper
- Specialized: India paper, Chameleon paper
- Thickness and texture vary by period and country

## Gum Condition
- Mint stamps: Original gum intact
- Hinged: Gum disturbed by removal
- Regummed: Has been given new gum

## Printing Methods
- Engraving: Raised ink, sharp details
- Lithography: Flat printing, smooth surface
- Typography: Raised letters, fine lines
- Photogravure: Detailed images with varying tones

## Cancellations
- Date cancellations: When and where stamped
- Types of cancellations: Maltese cross, duplex, etc.
- Impact on value varies by stamp

## Scott Catalog Numbering
- Standard numbering system for US stamps
- Used internationally in modified forms
- Helps determine value and rarity
      `
    });

    this.resources.push({
      title: "Perforation Guide",
      type: "txt",
      content: `
# Perforation Guide for Stamp Identification:

## Measurement
- Perforations are measured in 'teeth per 2 centimeters'
- Use a perforation gauge to determine exact measurements
- Common ranges: 8 to 14 for most issues

## Types
- Horizontal vs. Vertical perforations may differ
- Some stamps have different perforations on different sides
- Imperforate stamps have no perforations

## Significance
- Different perforations can indicate different printings
- Perforation errors are collectible in themselves
- Some perforations are characteristic of specific periods
      `
    });

    this.resources.push({
      title: "Country Identification",
      type: "txt",
      content: `
# Country Identification Guide:

## United States
- Most stamps have "USA" or "United States" printed on them
- US definitive stamps were issued from 1861-present
- Key series: Presidential, Liberty, American Flag, Eagle

## Great Britain
- No country name - uses monarch's head/profile
- First stamp: Penny Black (1840)
- Always shows current monarch's head/profile

## Commonwealth Countries
- Often have crown or royal symbols
- May include country name in English or local language

## European Countries
- Many have country names in local language
- Use of coat of arms or national symbols common
- Some countries changed names/political status

## Colonial/Dependency Stamps
- Often show "COLONIES" or similar designation
- May include both local name and governing country
      `
    });

    this.resources.push({
      title: "Condition Assessment",
      type: "txt",
      content: `
# Condition Assessment for Stamps:

## Mint Stamps (Never Hinged)
- Original gum completely intact
- No pin holes, tears, creases or other damage
- Highest value category for collectible stamps

## Mint Hinged
- Original gum present but disturbed by removal
- May have small indentations where hinges touched
- Lower value than Never Hinged but higher than used

## Used/Canceled
- Postmark or cancellation mark present
- Original gum completely missing
- Value depends on rarity and demand for unused

## Centering
- Perfect: Equal white space on all sides
- Slightly off-center: Small variation acceptable
- Poor centering significantly reduces value

## Damage Assessment
- Tears, thins, creases, stains all reduce value
- Repairs or regumming also affect value
- Color fading due to light exposure
      `
    });

    this.resources.push({
      title: "Rarity and Value Factors",
      type: "txt",
      content: `
# Factors Affecting Stamp Rarity and Value:

## Rarity Factors
- Low print run numbers
- Errors in printing (color, inversion, missing elements)
- Special varieties (different paper, perforation, etc.)
- Historical significance

## Condition Impact
- Mint Never Hinged > Mint Hinged > Used
- Centering quality
- Original gum vs. regummed
- Absence of visible damage

## Demand Factors
- Completeness of set (need for corner blocks)
- Popularity of topic/subject
- Historical significance
- Investment potential

## Authentication Markers
- Proper perforation count
- Correct paper type and color
- Appropriate postmarks for era
- Correct printing techniques and inks
      `
    });

    this.initialized = true;
  }

  async initialize(): Promise<void> {
    // In a Supabase edge function environment, we can't access the local file system
    // So we'll initialize with the default knowledge we've built-in
    if (!this.initialized) {
      this.initializeDefaultKnowledge();
    }
  }

  async addResource(title: string, type: 'pdf' | 'txt' | 'html', content: string): Promise<void> {
    this.resources.push({ title, type, content });
  }

  async extractPdfContent(filePath: string): Promise<string> {
    try {
      // In a Supabase edge function environment, accessing local files is not straightforward
      // This would need to be handled via Supabase storage or included as part of the deployment
      console.warn(`PDF extraction not implemented for edge function environment: ${filePath}`);
      return '';
    } catch (error) {
      console.error(`Error extracting PDF content from ${filePath}:`, error);
      return '';
    }
  }

  async extractHtmlContent(filePath: string): Promise<string> {
    try {
      // In a Supabase edge function environment, accessing local files is not straightforward
      // This would need to be handled via Supabase storage or included as part of the deployment
      console.warn(`HTML extraction not implemented for edge function environment: ${filePath}`);
      return '';
    } catch (error) {
      console.error(`Error extracting HTML content from ${filePath}:`, error);
      return '';
    }
  }

  async extractTextContent(filePath: string): Promise<string> {
    try {
      // In a Supabase edge function environment, accessing local files is not straightforward
      // This would need to be handled via Supabase storage or included as part of the deployment
      console.warn(`Text extraction not implemented for edge function environment: ${filePath}`);
      return '';
    } catch (error) {
      console.error(`Error extracting text content from ${filePath}:`, error);
      return '';
    }
  }

  getKnowledgeBase(): string {
    if (!this.initialized) {
      throw new Error('Preprocessor not initialized. Call initialize() first.');
    }

    return this.resources.map(resource => {
      return `=== ${resource.title} (${resource.type}) ===\n\n${resource.content}\n\n`;
    }).join('\n');
  }

  getStampKnowledge(): string {
    if (!this.initialized) {
      throw new Error('Preprocessor not initialized. Call initialize() first.');
    }

    // Combine all resources into a single knowledge base
    return this.getKnowledgeBase();
  }
}

// Export a singleton instance
let preprocessorInstance: StampResourcePreprocessor | null = null;

export const getStampResourcePreprocessor = (): StampResourcePreprocessor => {
  if (!preprocessorInstance) {
    preprocessorInstance = new StampResourcePreprocessor();
  }
  return preprocessorInstance;
};