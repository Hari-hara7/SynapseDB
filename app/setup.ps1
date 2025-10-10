# SynapseDB Setup Helper Script
# This script helps you set up the environment for SynapseDB

Write-Host "=== SynapseDB Setup Helper ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
} else {
    if (Test-Path ".env.example") {
        Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host "✓ .env file created" -ForegroundColor Green
        Write-Host "⚠ IMPORTANT: Edit .env and add your DATABASE_URL and GEMINI_API_KEY" -ForegroundColor Yellow
    } else {
        Write-Host "✗ .env.example not found" -ForegroundColor Red
    }
}

Write-Host ""

# Check Node.js version
Write-Host "Checking Node.js version..." -ForegroundColor Cyan
$nodeVersion = node --version
if ($nodeVersion) {
    Write-Host "✓ Node.js $nodeVersion installed" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if node_modules exists
if (Test-Path "node_modules") {
    Write-Host "✓ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== Setup Checklist ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. ✓ Create .env file (if not already done)" -ForegroundColor Yellow
Write-Host "2. Edit .env and add:" -ForegroundColor Yellow
Write-Host "   - DATABASE_URL (PostgreSQL connection string)" -ForegroundColor Gray
Write-Host "   - GEMINI_API_KEY (from https://ai.google.dev/)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Setup your PostgreSQL database:" -ForegroundColor Yellow
Write-Host "   Run: psql -U postgres -d yourdb -f setup-database.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Start the development server:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed instructions, see README.md" -ForegroundColor Cyan
Write-Host ""
