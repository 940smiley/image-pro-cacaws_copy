# Image Pro - Batch Image Processing Platform

## Project Overview

Image Pro is a sophisticated React-based web application that enables users to perform batch image processing operations with advanced features. The application allows users to upload, process, and enhance multiple images simultaneously with capabilities including automatic expansion, cropping, enhancement, and AI-powered image analysis.

### Key Features

- **Batch Processing**: Process up to 100 images simultaneously
- **Image Enhancement**: Automatic brightness, contrast, and saturation adjustments
- **Image Expansion**: Expand images before cropping with customizable percentage
- **Interactive Cropping**: Visual cropping tool with grid overlay
- **AI Analysis**: Gemini-powered image analysis with object detection
- **Pricing Integration**: eBay pricing data retrieval for identified objects
- **Collectible Analysis**: Specialized analysis for stamps, trading cards, postcards, old war letters, and other collectibles with accurate value estimation
- **Smart Renaming**: Automatically rename processed images based on Gemini's analysis (e.g., "George Washington 2 Cent Red Stamp")
- **Metadata Embedding**: Embed processing results and Gemini analysis directly into image metadata
- **Export Capabilities**: Export to JSON, PDF (with images and details), CSV (eBay format), XLSX (with images)
- **eBay Integration**: Direct listing to eBay using eBay API with proper formatting
- **Social Media Integration**: Connect to Facebook/Meta API for easy page listings and post generation
- **User Settings**: Persistent user preferences with Supabase backend
- **Theme Support**: Light, dark, and auto theme modes
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS
- **Cross-Platform Support**: Available for iOS, Windows, Linux, and macOS
- **AI Model Flexibility**: Ability to change AI model provider, API keys, and settings

### Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Icons**: Lucide React
- **Backend**: Supabase (authentication, database, edge functions)
- **Image Processing**: Canvas API for client-side operations
- **AI Integration**: Google Gemini API for image analysis (with support for multiple AI providers)
- **Marketplace Integration**: eBay Finding API for pricing data and listing
- **Social Media Integration**: Facebook/Meta API for page listings and posts
- **Cross-Platform**: Tauri/Rust or Electron for desktop apps, React Native for mobile
- **CI/CD**: GitHub Actions for automated releases and GitHub Pages deployment
- **Document Generation**: PDF generation library for reports
- **Metadata Handling**: Library for embedding metadata in images

## Enhanced Collectible Analysis Requirements

### Specialized Collectible Recognition

The application must implement specialized analysis for various collectible categories with high accuracy:

- **Stamps**: Identification of country of origin, year, denomination, condition, rarity, and estimated value
- **Trading Cards**: Recognition of sport, year, player, set, condition, and market value
- **Postcards**: Identification of era, location, publisher, historical significance, and rarity
- **Old War Letters**: Dating, historical context, authenticity markers, and historical value
- **Other Collectibles**: Coins, books, memorabilia, and other valuable items

### Value Estimation Accuracy

For accurate value estimation, the AI analysis must consider:
- Condition/rarity grading standards (e.g., Mint, Near Mint, Very Fine, Fine)
- Historical significance and provenance
- Market trends and recent sales data
- Authentication markers and counterfeiting indicators
- Professional grading service designations (PSA, CGC, etc.)

### Metadata and Export Requirements

- **Smart Image Naming**: Processed images are renamed based on detailed analysis (e.g., "1933 Goudey Babe Ruth #149 PSA 9", "1869 US 3 Cent Red George Washington", "WWII 1943 USO Letter from Normandy")
- **Metadata Embedding**: All analysis data, processing steps, and value estimates are embedded in image metadata
- **Export Formats**:
  - JSON: Complete analysis data with all metadata
  - PDF: Visual report with images and detailed descriptions
  - CSV: eBay-compatible format with proper column mappings
  - XLSX: Spreadsheet with embedded images and analysis data

## Export Capabilities and Marketplace Integration

### Export Formats

The application must support multiple export formats:

- **JSON Export**: Complete dataset with all image analysis, processing steps, and metadata
- **PDF Export**: Professional report with images, descriptions, and analysis data
- **CSV Export**: eBay-compatible format with proper column mappings for listing
- **XLSX Export**: Spreadsheet with embedded images and full analysis data
- **Metadata Embedding**: All analysis data embedded directly in image files

### eBay Integration

- **Direct Listing**: Use eBay API to create listings directly from the application
- **Proper Formatting**: Generate listings that comply with eBay's requirements
- **Image Optimization**: Optimize images for eBay's display requirements
- **Title and Description Generation**: Automatically generate compelling titles and descriptions based on analysis
- **Pricing Suggestions**: Provide suggested starting prices based on market data

### Social Media Integration

- **Facebook/Meta API**: Connect to Facebook pages for easy listing and post generation
- **Post Generation**: Create compelling social media posts with processed images and descriptions
- **Page Management**: Manage multiple Facebook pages from the application
- **Scheduling**: Schedule posts for optimal engagement times

### Cross-Platform Deployment

- **Desktop Applications**: Build for Windows, Linux, and macOS using Tauri/Rust or Electron
- **Mobile Applications**: iOS support through React Native
- **Web Application**: Responsive web app for browser access
- **Unified Codebase**: Maintain single codebase across platforms where possible

### CI/CD and Release Management

- **GitHub Actions**: Automated build, test, and release pipeline
- **GitHub Pages**: Host web version on GitHub Pages
- **Cross-Platform Builds**: Automated builds for all supported platforms
- **Release Management**: Automated versioning and release notes

### AI Model Flexibility

- **Multiple Providers**: Support for different AI model providers (OpenAI, Anthropic, Gemini, etc.)
- **API Key Management**: Secure storage and management of multiple API keys
- **Model Selection**: Allow users to choose different models based on their needs
- **Custom Prompts**: Support for custom prompts for specialized analysis

## Building and Running

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account with configured project
- Google Gemini API key
- eBay Developer account with App ID and Access Token

### Environment Setup

Create a `.env` file in the project root with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
EBAY_APP_ID=your_ebay_app_id
EBAY_ACCESS_TOKEN=your_ebay_access_token
```

### Installation and Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Type check
npm run typecheck

# Preview production build
npm run preview
```

## Development Conventions

### Code Structure

- `src/components/` - React components (BatchProcessor, Settings, ImageEditor, etc.)
- `src/utils/` - Utility functions (image processing, API clients)
- `src/lib/` - Library modules (Supabase client, theme manager)
- `src/types/` - TypeScript type definitions
- `supabase/functions/` - Edge functions for backend API

### Image Processing Pipeline

The application processes images through the following pipeline:
1. **Expansion** (optional) - Expands image canvas by specified percentage
2. **Cropping** (manual) - Interactive cropping with visual editor
3. **Enhancement** (automatic) - Adjusts brightness, contrast, and saturation
4. **Output** - Generates processed image as PNG blob

### Theming System

The application implements a flexible theming system with three modes:
- Light theme
- Dark theme
- Auto theme (follows system preference)

Themes are persisted in localStorage and applied via CSS custom properties.

### API Integration

The application integrates with external services through Supabase edge functions:
- **Gemini Analysis**: Analyzes images and identifies objects, categories, and colors
- **eBay Pricing**: Retrieves pricing data for identified objects

## Architecture

### Frontend Architecture

The application follows a component-based architecture with the main App component managing state for:
- Active tab navigation (Processor, Settings, About)
- User settings with persistence via Supabase
- Theme management
- Image processing state

### Backend Architecture

Supabase provides the backend infrastructure:
- Authentication for user accounts
- Database storage for user settings
- Edge functions for external API integrations
- Storage for user data

### Data Flow

1. User uploads images via the BatchProcessor component
2. Images are stored temporarily with preview URLs
3. Processing operations are applied based on user settings
4. Results are cached as object URLs
5. User settings are persisted in Supabase
6. AI analysis is performed via Supabase edge functions

## Key Components

### BatchProcessor
Main component for handling image uploads, processing, and display of results.

### ImageEditor
Interactive cropping tool with grid overlay and visual feedback.

### Settings
User preferences panel for configuring processing options and application settings.

### ImageAnalysisPanel
Display panel for AI-generated image analysis and eBay pricing data.

## API Endpoints

The application uses Supabase edge functions:
- `/analyze-image-gemini` - Processes image with Google Gemini API (enhanced for collectibles)
- `/ebay-search-pricing` - Retrieves pricing data from eBay API
- `/ebay-create-listing` - Creates eBay listings using eBay API
- `/facebook-post-generation` - Generates Facebook posts using Meta API
- `/generate-pdf-report` - Creates PDF reports with images and analysis
- `/generate-csv-export` - Creates eBay-compatible CSV exports
- `/embed-metadata` - Embeds analysis data into image metadata
- `/rename-images` - Renames images based on AI analysis
- `/multi-provider-ai` - Supports multiple AI providers (OpenAI, Anthropic, etc.)

## Database Schema

The application uses Supabase tables for:

- `user_settings` - User preferences for processing, UI, and API configurations
- `processing_history` - Records of all image processing operations with analysis results
- `ebay_listings` - eBay listing data and status tracking
- `facebook_posts` - Social media post data and scheduling information
- `ai_provider_configs` - Configuration for multiple AI providers (API keys, models, etc.)
- `export_templates` - Custom templates for different export formats
- `collectible_catalogs` - Reference data for collectible identification and valuation

## Testing

The project includes comprehensive testing for all new features:

```bash
# Run TypeScript type checking
npm run typecheck

# Run ESLint for code quality
npm run lint

# Run unit tests for image processing
npm run test:unit

# Run integration tests for API integrations
npm run test:integration

# Run end-to-end tests for cross-platform functionality
npm run test:e2e

# Run all tests
npm run test
```

## Deployment

The application supports multiple deployment options:

### Web Deployment
- Deploy the static build to GitHub Pages using GitHub Actions
- Host on any static hosting service (Vercel, Netlify, etc.)

### Desktop Applications
- Build cross-platform desktop apps using Tauri/Rust or Electron
- Automated GitHub Actions for building Windows, Linux, and macOS binaries

### Mobile Applications
- Build iOS app using React Native
- Automated build pipeline for app store deployment

### CI/CD Pipeline
- GitHub Actions for automated testing, building, and deployment
- Automated release generation with cross-platform binaries
- Version management and changelog generation

## Security Considerations

- API keys are stored securely in environment variables and not committed to version control
- Supabase authentication provides user isolation and secure data access
- Client-side image processing ensures privacy of user images
- CORS headers are configured for all edge functions
- Secure storage of multiple AI provider API keys
- Encrypted storage of sensitive user data
- OAuth 2.0 for eBay and Facebook API integrations