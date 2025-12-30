@echo off
REM setup-dev-environment.bat
REM Script to set up the development environment for Image Pro

echo Setting up Image Pro development environment...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed. Please install Node.js before continuing.
    exit /b 1
)

REM Check Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
set NODE_VERSION=%NODE_VERSION:v=%
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set NODE_MAJOR=%%a

if %NODE_MAJOR% LSS 18 (
    echo Node.js version 18 or higher is required. Current version: %NODE_VERSION%
    exit /b 1
)

echo Node.js version %NODE_VERSION% is installed.

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo npm is not installed.
    exit /b 1
)

echo npm is installed.

REM Install project dependencies
echo Installing project dependencies...
npm install

REM Check if installation was successful
if errorlevel 0 (
    echo Dependencies installed successfully.
) else (
    echo Failed to install dependencies.
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    echo // Image Pro Environment Variables > .env
    echo VITE_SUPABASE_URL= >> .env
    echo VITE_SUPABASE_ANON_KEY= >> .env
    echo GEMINI_API_KEY= >> .env
    echo EBAY_APP_ID= >> .env
    echo EBAY_ACCESS_TOKEN= >> .env
    echo VITE_EBAY_CERT_ID= >> .env
    echo VITE_EBAY_AUTH_TOKEN= >> .env
    echo .env file created. Please update with your API keys.
)

REM Install additional development tools
echo Installing development tools...
npm install -g supabase
npm install -g @tauri-apps/cli
npm install -g electron-builder

echo Development environment setup complete!
echo.
echo To start the development server, run:
echo   npm run dev
echo.
echo To build the project, run:
echo   npm run build
echo.
echo Don't forget to update your .env file with API keys!