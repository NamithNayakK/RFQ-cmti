param(
    [string]$Command = "help"
)

switch($Command) {
    "backend" {
        Write-Host "Starting Manufacturing STP File Storage API Backend..."
        Write-Host "Port: 8000"
        Set-Location d:\ADA\backend
        & d:\ADA\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
    }
    "frontend" {
        Write-Host "Starting Manufacturing STP File Storage Frontend..."
        Write-Host "Port: 3000"
        Set-Location d:\ADA\frontend
        npm install 2>&1 | Out-Null
        npm run dev
    }
    "help" {
        Write-Host "Manufacturing STP File Storage System - Launch Script"
        Write-Host ""
        Write-Host "Usage: .\start.ps1 -Command <command>"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  backend   - Start the FastAPI backend server on port 8000"
        Write-Host "  frontend  - Install dependencies and start the React frontend on port 3000"
        Write-Host "  help      - Display this help message"
    }
    default {
        Write-Host "Unknown command: $Command"
        Write-Host "Type '.\start.ps1 -Command help' for usage information"
    }
}
