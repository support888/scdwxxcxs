# Verify all app.json pages have their 4 files (ASCII-only)
$ErrorActionPreference = 'Stop'
$root = (Get-ChildItem "c:\Users\songz\OUTPUT" -Directory -Filter "LLS*" | Select-Object -First 1).FullName
$utf8 = New-Object System.Text.UTF8Encoding($false)
$cfg = [System.IO.File]::ReadAllText("$root\app.json", $utf8) | ConvertFrom-Json
$all = @($cfg.pages)
foreach ($p in $cfg.subPackages) {
  foreach ($pg in $p.pages) { $all += ($p.root.TrimEnd('/') + '/' + $pg) }
}
$miss = @()
foreach ($pg in $all) {
  foreach ($ext in @('js','json','wxml','wxss')) {
    if (-not (Test-Path (Join-Path $root ($pg + '.' + $ext)))) { $miss += ($pg + '.' + $ext) }
  }
}
Write-Output ("total pages: " + $all.Count)
if ($miss) { Write-Output 'MISSING:'; $miss } else { Write-Output 'ALL PAGES OK' }
