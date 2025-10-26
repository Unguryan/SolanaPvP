# PowerShell script to run Entity Framework migrations
# Usage: .\migrate.ps1 [add|update|remove] [migration-name]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("add", "update", "remove")]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [string]$MigrationName = ""
)

$ProjectPath = "API\SolanaPvP.EF_Core"
$StartupProject = "API\SolanaPvP.API_Project"

Write-Host "Running EF Core migration: $Action" -ForegroundColor Green

switch ($Action) {
    "add" {
        if ([string]::IsNullOrEmpty($MigrationName)) {
            Write-Host "Migration name is required for 'add' action" -ForegroundColor Red
            exit 1
        }
        Write-Host "Adding migration: $MigrationName" -ForegroundColor Yellow
        dotnet ef migrations add $MigrationName --project $ProjectPath --startup-project $StartupProject
    }
    "update" {
        Write-Host "Updating database..." -ForegroundColor Yellow
        dotnet ef database update --project $ProjectPath --startup-project $StartupProject
    }
    "remove" {
        if ([string]::IsNullOrEmpty($MigrationName)) {
            Write-Host "Migration name is required for 'remove' action" -ForegroundColor Red
            exit 1
        }
        Write-Host "Removing migration: $MigrationName" -ForegroundColor Yellow
        dotnet ef migrations remove --project $ProjectPath --startup-project $StartupProject
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Migration failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}
