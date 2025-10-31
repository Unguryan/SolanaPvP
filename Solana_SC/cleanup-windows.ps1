# Полная очистка всех установок Solana/Anchor на Windows
# ОСТОРОЖНО: Удалит все Solana и Anchor установки!

Write-Host "========================================" -ForegroundColor Red
Write-Host "ОЧИСТКА Windows от Solana/Anchor" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Этот скрипт удалит:" -ForegroundColor Yellow
Write-Host "  - Solana (Agave) установку" -ForegroundColor White
Write-Host "  - Anchor (AVM) и все версии" -ForegroundColor White
Write-Host "  - Rust toolchain 'solana'" -ForegroundColor White
Write-Host "  - Cargo установленные инструменты (anchor-cli, avm, cargo-build-sbf)" -ForegroundColor White
Write-Host "  - Временные файлы и скрипты установки" -ForegroundColor White
Write-Host ""
Write-Host "НЕ будет удалено:" -ForegroundColor Green
Write-Host "  - Системный Rust (stable, nightly, версии 1.x)" -ForegroundColor White
Write-Host "  - Ваши проекты" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Продолжить? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Отменено." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[1/6] Удаление Solana (Agave)..." -ForegroundColor Yellow
$solanaPath = "$env:USERPROFILE\.local\share\solana"
if (Test-Path $solanaPath) {
    Remove-Item $solanaPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Удалено: $solanaPath" -ForegroundColor Green
} else {
    Write-Host "  Не найдено" -ForegroundColor Gray
}

Write-Host "[2/6] Удаление Anchor (AVM)..." -ForegroundColor Yellow
$avmPath = "$env:USERPROFILE\.avm"
if (Test-Path $avmPath) {
    Remove-Item $avmPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Удалено: $avmPath" -ForegroundColor Green
} else {
    Write-Host "  Не найдено" -ForegroundColor Gray
}

Write-Host "[3/6] Удаление Rust toolchain 'solana'..." -ForegroundColor Yellow
$toolchains = rustup toolchain list 2>&1 | Select-String "solana"
if ($toolchains) {
    rustup toolchain uninstall solana 2>&1 | Out-Null
    Write-Host "  Toolchain 'solana' удален" -ForegroundColor Green
} else {
    Write-Host "  Toolchain 'solana' не найден" -ForegroundColor Gray
}

Write-Host "[4/6] Удаление Cargo установленных инструментов..." -ForegroundColor Yellow
$cargoBin = "$env:USERPROFILE\.cargo\bin"
$toolsToRemove = @("anchor.exe", "anchor-cli.exe", "avm.exe", "cargo-build-sbf.exe", "solana-install-init.exe")

foreach ($tool in $toolsToRemove) {
    $toolPath = Join-Path $cargoBin $tool
    if (Test-Path $toolPath) {
        Remove-Item $toolPath -Force -ErrorAction SilentlyContinue
        Write-Host "  Удалено: $tool" -ForegroundColor Green
    }
}

Write-Host "[5/6] Очистка PATH от Solana/Anchor путей..." -ForegroundColor Yellow
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$pathsToRemove = @(
    "$env:USERPROFILE\.local\share\solana\install\active_release\bin",
    "$env:USERPROFILE\.local\share\solana\install\active_release\solana-release\bin",
    "$env:USERPROFILE\.avm\bin"
)

$newPath = $userPath
foreach ($path in $pathsToRemove) {
    $newPath = $newPath -replace [regex]::Escape($path), ""
    $newPath = $newPath -replace ";;", ";"
}

if ($newPath -ne $userPath) {
    [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
    Write-Host "  PATH очищен" -ForegroundColor Green
} else {
    Write-Host "  PATH не содержит Solana/Anchor путей" -ForegroundColor Gray
}

Write-Host "[6/6] Удаление временных файлов..." -ForegroundColor Yellow
$tempFiles = @(
    "$env:TEMP\solana-install-init.exe",
    "$env:TEMP\agave-install-init.exe",
    "$env:TEMP\rustup-init.exe"
)

foreach ($file in $tempFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force -ErrorAction SilentlyContinue
        Write-Host "  Удалено: $file" -ForegroundColor Green
    }
}

# Удаление git кэша Anchor
$anchorGitCache = "$env:USERPROFILE\.cargo\git\checkouts\anchor-*"
if (Test-Path $anchorGitCache.Replace('*', '')) {
    Get-ChildItem "$env:USERPROFILE\.cargo\git\checkouts" -Filter "anchor-*" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Удален кэш Anchor: $($_.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Очистка завершена!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Осталось в системе:" -ForegroundColor Cyan
rustup toolchain list | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
Write-Host ""
Write-Host "Теперь можно устанавливать все в WSL!" -ForegroundColor Green
Write-Host "Запустите: bash setup-wsl.sh в WSL терминале" -ForegroundColor Yellow
Write-Host ""

