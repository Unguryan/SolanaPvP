# PowerShell script to copy IDL files after build
# Run this after: anchor build

Write-Host "Copying IDL files to frontend and backend..." -ForegroundColor Cyan

# Copy JSON IDL
$jsonSource = ".\target\idl\pvp_program.json"
$jsonDestFrontend = "..\FRONT\SolanaPvP.Front\src\idl\pvp_program.json"
$jsonDestBackend = "..\API\SolanaPvP.SolanaRPC\idl\pvp_program.json"
$jsonDestWwwroot = "..\API\SolanaPvP.API_Project\wwwroot\idl\pvp_program.json"

if (Test-Path $jsonSource) {
    Copy-Item $jsonSource $jsonDestFrontend -Force
    Write-Host "✅ Copied pvp_program.json to FRONTEND" -ForegroundColor Green
    
    Copy-Item $jsonSource $jsonDestBackend -Force
    Write-Host "✅ Copied pvp_program.json to BACKEND (API/SolanaRPC)" -ForegroundColor Green
    
    Copy-Item $jsonSource $jsonDestWwwroot -Force
    Write-Host "✅ Copied pvp_program.json to BACKEND (wwwroot)" -ForegroundColor Green
} else {
    Write-Host "❌ Source file not found: $jsonSource" -ForegroundColor Red
    Write-Host "   Did you run 'anchor build' first?" -ForegroundColor Yellow
    exit 1
}

# Copy TypeScript types
$tsSource = ".\target\types\pvp_program.ts"
$tsDestFrontend = "..\FRONT\SolanaPvP.Front\src\idl\pvp_program.ts"
$tsDestBackend = "..\API\SolanaPvP.SolanaRPC\idl\pvp_program.ts"

if (Test-Path $tsSource) {
    # Read the TS file
    $content = Get-Content $tsSource -Raw
    
    # Add IDL export at the end
    $exportCode = @"


// Export the IDL as a const that can be used with Program
import idlJson from "./pvp_program.json";
export const IDL: PvpProgram = idlJson as unknown as PvpProgram;
"@
    
    $newContent = $content + $exportCode
    
    # Write to FRONTEND
    Set-Content $tsDestFrontend $newContent -NoNewline
    Write-Host "✅ Copied and updated pvp_program.ts to FRONTEND with IDL export" -ForegroundColor Green
    
    # Write to BACKEND
    Set-Content $tsDestBackend $newContent -NoNewline
    Write-Host "✅ Copied and updated pvp_program.ts to BACKEND with IDL export" -ForegroundColor Green
} else {
    Write-Host "❌ Source file not found: $tsSource" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 IDL files updated successfully in ALL locations!" -ForegroundColor Green
Write-Host "   - Frontend: FRONT\SolanaPvP.Front\src\idl\" -ForegroundColor Cyan
Write-Host "   - Backend: API\SolanaPvP.SolanaRPC\idl\" -ForegroundColor Cyan
Write-Host "   - Wwwroot: API\SolanaPvP.API_Project\wwwroot\idl\" -ForegroundColor Cyan

