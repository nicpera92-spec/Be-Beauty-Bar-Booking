# Quick verification that the site and APIs work.
# Run with: .\scripts\verify-site.ps1
# Ensure the dev server is running (npm run dev) first.

$base = "http://localhost:3001"
$passed = 0
$failed = 0

function Test-Endpoint {
  param($Name, $Url, $Method = "Get", $Body = $null, $Headers = @{})
  try {
    $params = @{ Uri = $Url; Method = $Method; UseBasicParsing = $true; TimeoutSec = 10 }
    if ($Headers.Count -gt 0) { $params.Headers = $Headers }
    if ($Body) { $params.Body = $Body; $params.ContentType = "application/json" }
    $r = Invoke-WebRequest @params
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) {
      Write-Host "  OK   $Name" -ForegroundColor Green
      $script:passed++
      return $true
    }
  } catch {}
  Write-Host "  FAIL $Name" -ForegroundColor Red
  $script:failed++
  return $false
}

Write-Host "`nVerifying Be Beauty Bar site..." -ForegroundColor Cyan
Test-Endpoint -Name "Home" -Url "$base/"
Test-Endpoint -Name "Book" -Url "$base/book"
Test-Endpoint -Name "Admin" -Url "$base/admin"
Test-Endpoint -Name "API Services" -Url "$base/api/services"
Test-Endpoint -Name "API Settings" -Url "$base/api/settings"

$loginBody = '{"email":"Svit.uk@hotmail.com","password":"123456789"}'
$loginResp = Invoke-RestMethod -Uri "$base/api/admin/login" -Method Post -Body $loginBody -ContentType "application/json" -ErrorAction SilentlyContinue
if ($loginResp.token) {
  Write-Host "  OK   Admin login" -ForegroundColor Green
  $passed++
  $token = $loginResp.token
  $auth = @{ Authorization = "Bearer $token" }
  try {
    $te = Invoke-WebRequest -Uri "$base/api/admin/test-email" -Method Post -Body "{}" -Headers $auth -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    $code = $te.StatusCode
    if ($code -eq 200) { Write-Host "  OK   Test email (sent)" -ForegroundColor Green; $passed++ }
    elseif ($code -eq 503) { Write-Host "  OK   Test email (503 - set RESEND_API_KEY in .env to enable)" -ForegroundColor Yellow; $passed++ }
    else { Write-Host "  FAIL Test email ($code)" -ForegroundColor Red; $failed++ }
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 503) { Write-Host "  OK   Test email (503 - set RESEND_API_KEY in .env to enable)" -ForegroundColor Yellow; $passed++ }
    else { Write-Host "  FAIL Test email" -ForegroundColor Red; $failed++ }
  }
} else {
  Write-Host "  FAIL Admin login" -ForegroundColor Red
  $failed++
}

$bookDate = (Get-Date).AddDays(14).ToString("yyyy-MM-dd")
$bookingBody = "{`"serviceId`":`"classic-manicure`",`"customerName`":`"Verify Test`",`"customerEmail`":`"verify@test.com`",`"date`":`"$bookDate`",`"startTime`":`"10:00`",`"endTime`":`"12:00`",`"depositAmount`":10,`"notifyByEmail`":true,`"notifyBySMS`":false}"
try {
  $book = Invoke-RestMethod -Uri "$base/api/bookings" -Method Post -Body $bookingBody -ContentType "application/json"
  if ($book.id) {
    Write-Host "  OK   Create booking" -ForegroundColor Green
    $passed++
  } else { Write-Host "  FAIL Create booking" -ForegroundColor Red; $failed++ }
} catch {
  Write-Host "  FAIL Create booking" -ForegroundColor Red
  $failed++
}

Write-Host "`nResult: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "If test-email failed with 503: add RESEND_API_KEY to .env and restart the server, then use Admin -> Settings -> Send test email.`n"
