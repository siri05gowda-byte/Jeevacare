#!/usr/bin/env pwsh
# Run all test files and aggregate results

$testFiles = @(
    "src/utils/auth.test.js",
    "src/utils/errors.test.js",
    "src/utils/jeevaIdGenerator.test.js",
    "src/services/authorizationSecurity.test.js",
    "src/services/Phase5AuthorizationTests.test.js",
    "src/services/Phase5EndToEndTests.test.js",
    "src/services/Phase5ImmutabilityTests.test.js",
    "src/services/Phase7IndependentVerification.test.js",
    "src/adapters/TesseractOCRAdapter.test.js",
    "src/routes/healthRoutes.test.js",
    "src/routes/patientRoutes.test.js",
    "src/services/AuditService.test.js",
    "src/services/DocumentService.test.js",
    "src/services/OCRService.test.js",
    "src/services/Phase7AITests.test.js"
)

cd c:\Users\user\OneDrive\Desktop\JeevaCare\server

$totalPass = 0
$totalFail = 0
$results = @()

foreach ($file in $testFiles) {
    Write-Host "Testing: $file" -ForegroundColor Cyan
    
    $output = & npx vitest run $file 2>&1 | Out-String
    
    # Extract test counts
    if ($output -match "Tests\s+(\d+)\s+passed\s+\(\d+\)") {
        $passed = [int]$matches[1]
        $totalPass += $passed
        $status = "✓ PASS"
        $color = "Green"
    } elseif ($output -match "(\d+)\s+failed.*?(\d+)\s+passed") {
        $failed = [int]$matches[1]
        $passed = [int]$matches[2]
        $totalFail += $failed
        $totalPass += $passed
        $status = "✗ FAIL ($failed failing)"
        $color = "Red"
    } else {
        $status = "? UNKNOWN"
        $color = "Yellow"
    }
    
    Write-Host "  $status`n" -ForegroundColor $color
    $results += [PSCustomObject]@{
        File = $file
        Status = $status
    }
}

Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
foreach ($result in $results) {
    Write-Host $result.File -ForegroundColor Gray
    Write-Host "  $($result.Status)" -ForegroundColor $(if ($result.Status -like "*PASS*") { "Green" } else { "Red" })
}

Write-Host "`nTotal Passed: $totalPass" -ForegroundColor Green
Write-Host "Total Failed: $totalFail" -ForegroundColor $(if ($totalFail -eq 0) { "Green" } else { "Red" })
