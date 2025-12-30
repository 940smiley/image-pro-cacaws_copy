@echo off
REM build-and-release.bat
REM Script to build and release Image Pro

echo Building and releasing Image Pro...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed. Please install Node.js before continuing.
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo npm is not installed.
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
npm install

if errorlevel 1 (
    echo Failed to install dependencies.
    exit /b 1
)

REM Run tests
echo Running tests...
npm run test

if errorlevel 1 (
    echo Tests failed. Please fix the issues before building.
    exit /b 1
)

REM Build the web application
echo Building web application...
npm run build

if errorlevel 1 (
    echo Web build failed.
    exit /b 1
)

echo Web application built successfully.

REM Build Tauri desktop application (if configured)
if exist "src-tauri" (
    echo Building Tauri desktop application...
    
    REM Check if Rust is installed
    rustc --version >nul 2>&1
    if errorlevel 1 (
        echo Rust is not installed. Please install Rust before continuing.
        echo Visit https://www.rust-lang.org/tools/install
        REM Uncomment the following lines if you want to install Rust automatically
        REM curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        REM call "%USERPROFILE%\.cargo\env.bat"
    )
    
    REM Install Tauri CLI if not installed
    cargo tauri --version >nul 2>&1
    if errorlevel 1 (
        echo Installing Tauri CLI...
        cargo install tauri-cli
    )
    
    cd src-tauri
    cargo tauri build
    cd ..
    
    if errorlevel 0 (
        echo Tauri desktop application built successfully.
    ) else (
        echo Tauri desktop build failed.
        exit /b 1
    )
)

REM Build Electron application (if configured)
if exist "electron\main.ts" (
    echo Building Electron application...
    
    REM Install electron-builder if not installed
    npm install --save-dev electron-builder
    
    REM Build Electron app
    npx electron-builder --publish=never
    
    if errorlevel 0 (
        echo Electron application built successfully.
    ) else (
        echo Electron build failed.
        exit /b 1
    )
)

REM Run security audit
echo Running security audit...
npm audit

REM Create release notes
echo Creating release notes...
for /f %%i in ('node -p "require('./package.json').version"') do set RELEASE_VERSION=%%i
set RELEASE_NAME=v%RELEASE_VERSION%
for /f "tokens=*" %%d in ('date /t') do set DATE=%%d

echo # Release %RELEASE_NAME% - %DATE% > RELEASE_NOTES.md
echo. >> RELEASE_NOTES.md
echo ## What's New >> RELEASE_NOTES.md
echo. >> RELEASE_NOTES.md
echo - Enhanced AI analysis for collectibles ^(stamps, trading cards, postcards, war letters^) >> RELEASE_NOTES.md
echo - Smart image renaming based on AI analysis >> RELEASE_NOTES.md
echo - Metadata embedding with processing details >> RELEASE_NOTES.md
echo - Export functionality for JSON, PDF, CSV, and XLSX formats >> RELEASE_NOTES.md
echo - Direct eBay listing integration >> RELEASE_NOTES.md
echo - Facebook/Meta API integration for social media posts >> RELEASE_NOTES.md
echo - Cross-platform support ^(Windows, Linux, macOS, iOS^) >> RELEASE_NOTES.md
echo - Multi-provider AI support ^(Gemini, OpenAI, Anthropic^) >> RELEASE_NOTES.md
echo - Improved UI with export and AI configuration panels >> RELEASE_NOTES.md
echo. >> RELEASE_NOTES.md
echo ## Bug Fixes >> RELEASE_NOTES.md
echo. >> RELEASE_NOTES.md
echo - Fixed image processing pipeline issues >> RELEASE_NOTES.md
echo - Improved error handling and user feedback >> RELEASE_NOTES.md
echo - Enhanced security with proper API key management >> RELEASE_NOTES.md
echo. >> RELEASE_NOTES.md
echo ## Performance Improvements >> RELEASE_NOTES.md
echo. >> RELEASE_NOTES.md
echo - Optimized batch processing for large image sets >> RELEASE_NOTES.md
echo - Improved memory management for image processing >> RELEASE_NOTES.md
echo - Faster AI analysis with caching mechanisms >> RELEASE_NOTES.md

echo Build and release process completed successfully!
echo Release version: %RELEASE_NAME%
echo Release notes created: RELEASE_NOTES.md