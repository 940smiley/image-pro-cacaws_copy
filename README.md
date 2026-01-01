# Image Pro - Professional Batch Image Processing

## About
Image Pro is a powerful batch image processing platform that allows you to process up to 100 images simultaneously with advanced features including AI-powered analysis, smart renaming, metadata embedding, and direct listing capabilities.

**Live Demo:** [https://940smiley.github.io/image-pro-cacaws_copy/](https://940smiley.github.io/image-pro-cacaws_copy/)

## Features

- Batch processing of up to 100 images
- Automatic image expansion before cropping
- Intelligent auto-enhancement with brightness, contrast, and saturation adjustments
- Interactive cropping with visual feedback
- Grid overlay for precise editing
- Customizable processing settings
- Bulk download of processed images
- AI-powered image analysis for collectibles (stamps, trading cards, postcards, war letters)
- Smart renaming based on AI analysis
- Metadata embedding with processing details
- Export to multiple formats (JSON, PDF, CSV, XLSX)
- Direct listing on eBay
- Social media sharing (Facebook)
- Cross-platform support (Windows, Linux, macOS, iOS)
- Multi-provider AI support (Gemini, OpenAI, Anthropic)

## Quick Start

### Prerequisites

- Node.js (version 18 or higher)
- npm

### Setup Development Environment

#### On Windows:
```bash
npm run setup:win
```

#### On macOS/Linux:
```bash
npm run setup
```

This will:
- Verify Node.js and npm installation
- Install project dependencies
- Create a `.env` file with environment variable placeholders
- Install additional development tools (Supabase CLI, Tauri CLI, Electron Builder)

### Running the Application

```bash
npm run dev
```

### Building the Application

#### Web Application:
```bash
npm run build
```

#### Complete Build (Web, Desktop):
```bash
# On Windows:
npm run build:all:win

# On macOS/Linux:
npm run build:all
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Provider Configuration
GEMINI_API_KEY=your_gemini_api_key

# eBay API Configuration
EBAY_APP_ID=your_ebay_app_id
EBAY_ACCESS_TOKEN=your_ebay_access_token
VITE_EBAY_CERT_ID=your_ebay_cert_id
VITE_EBAY_AUTH_TOKEN=your_ebay_auth_token
VITE\_SUPABASE\_URL: Your Supabase project URL. You can find this in your Supabase dashboard.
VITE\_SUPABASE\_ANON\_KEY: Your Supabase anon key. You can find this in your Supabase dashboard.
GEMINI\_API\_KEY: Your Google Gemini API key. You need to create a Google Cloud project and enable the Gemini API to obtain this key. See https://makersuite.google.com/app/apikey for more information.
EBAY\_APP\_ID: Your eBay application ID. You need to register as an eBay developer to obtain this ID. See https://developer.ebay.com/ for more information.
EBAY\_ACCESS\_TOKEN: Your eBay access token. This is required for making API calls to eBay on behalf of a user. This can be a user token or an application token depending on the specific API calls you are making.
VITE\_EBAY\_CERT\_ID: Your eBay certificate ID, obtained when you registered as a developer.
VITE\_EBAY\_AUTH\_TOKEN: Your eBay authentication token, obtained after a user authorizes your application to access their eBay account. This is often needed for listing items.
It is recommended to keep these keys secure and not commit them directly to your repository. Use environment variables or a secure configuration management system.

Running Supabase Locally (Optional)
If you want to run Supabase locally for development, you can use the Supabase CLI. Follow these steps:

Install the Supabase CLI: Follow the instructions on the Supabase website: https://supabase.com/docs/cli/getting-started
Initialize Supabase: Run supabase init in the supabase directory.
Start Supabase: Run supabase start in the supabase directory. This will start the Supabase services in Docker containers.
Apply Migrations: Run supabase db push to apply the database migrations.
Generate Types: Run supabase gen types typescript --project-id your-project-id > types/supabase.ts to generate the TypeScript types for your Supabase database. Replace your-project-id with your Supabase Project ID, which can be found in the Supabase dashboard.
Note: Running Supabase locally requires Docker to be installed and running on your system.

Project Structure
image-pro/
├── src/                    # Source code
│   ├── components/         # React components
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   ├── lib/               # Library modules
│   └── App.tsx            # Main application component
├── supabase/              # Supabase configuration and functions
│   ├── functions/         # Edge functions
│   └── migrations/        # Database migrations
├── scripts/               # Automation scripts
├── electron/              # Electron configuration
├── src-tauri/             # Tauri configuration
├── .github/               # GitHub Actions workflows
└── public/                # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build web application
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run setup` - Setup development environment (macOS/Linux)
- `npm run setup:win` - Setup development environment (Windows)
- `npm run build:all` - Build complete application (macOS/Linux)
- `npm run build:all:win` - Build complete application (Windows)
- `npm run test` - Run tests
- `npm run release` - Build and create release

## API Endpoints

The application uses Supabase Edge Functions for backend services:

- `/analyze-image-gemini` - Analyze images with Google Gemini
- `/ebay-search-pricing` - Search eBay for pricing data
- `/ebay-create-listing` - Create eBay listings
- `/facebook-post-generation` - Generate Facebook posts
- `/generate-pdf-report` - Create PDF reports
- `/generate-csv-export` - Create CSV exports
- `/embed-metadata` - Embed metadata in images
- `/rename-images` - Rename images based on analysis
- `/multi-provider-ai` - Support multiple AI providers

## Database Schema

The application uses Supabase for data storage with the following tables:

- `user_settings` - User preferences
- `processing_history` - Records of image processing operations
- `ebay_listings` - eBay listing data
- `facebook_posts` - Social media post data
- `ai_provider_configs` - AI provider configurations
- `export_templates` - Export template configurations
- `collectible_catalogs` - Reference data for collectibles

## Cross-Platform Support

Image Pro supports multiple platforms:

- **Web Application**: Built with React and Vite
- **Desktop Applications**: Built with Tauri (Rust) or Electron
- **Mobile Applications**: Planned support with React Native

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.