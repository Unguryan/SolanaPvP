# PowerShell script to copy IDL files after build
# Run this after: anchor build

Write-Host "Copying IDL files to frontend..." -ForegroundColor Cyan

# Copy JSON IDL
$jsonSource = ".\target\idl\pvp_program.json"
$jsonDest = "..\FRONT\SolanaPvP.Front\src\idl\pvp_program.json"

if (Test-Path $jsonSource) {
    Copy-Item $jsonSource $jsonDest -Force
    Write-Host "✅ Copied pvp_program.json" -ForegroundColor Green
} else {
    Write-Host "❌ Source file not found: $jsonSource" -ForegroundColor Red
    Write-Host "   Did you run 'anchor build' first?" -ForegroundColor Yellow
    exit 1
}

# Copy TypeScript types
$tsSource = ".\target\types\pvp_program.ts"
$tsDest = "..\FRONT\SolanaPvP.Front\src\idl\pvp_program.ts"

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
    
    # Write to destination
    Set-Content $tsDest $newContent -NoNewline
    Write-Host "✅ Copied and updated pvp_program.ts with IDL export" -ForegroundColor Green
} else {
    Write-Host "❌ Source file not found: $tsSource" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 IDL files updated successfully!" -ForegroundColor Green
Write-Host "   Frontend will now use the new IDL with events." -ForegroundColor Cyan

