# Export Add-On thickness delta data from Card Add-on Access DB
# Computes: hologramDelta = avg(Holo A/B/C) - avg(Card A/B/C)
#           sigPanelDelta = avg(Sig A/B/C) - avg(Card A/B/C)
# Run: powershell -ExecutionPolicy Bypass -File export-addon-accdb.ps1

$dbPath  = "C:\Users\Quali\CQM\Card Add on 2019511.accdb"
$outPath = "C:\Users\Quali\CQM\backend\scripts\data\addon-monitoring.json"

$USL = 0.05

$dir = Split-Path $outPath
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;" + "Data Source=" + $dbPath + ";"
$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
$conn.Open()

$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT * FROM [Database1] ORDER BY [Test Date] ASC, [Test Time] ASC"
$reader = $cmd.ExecuteReader()

$results = @()
$skipped = 0
$total   = 0

function SafeAvg($a, $b, $c) {
  $vals = @($a, $b, $c) | Where-Object {
    $_ -ne $null -and $_ -ne [DBNull]::Value -and [double]$_ -gt 0
  }
  if ($vals.Count -lt 1) { return $null }
  $nums = $vals | ForEach-Object { [double]$_ }
  return [math]::Round(($nums | Measure-Object -Average).Average, 4)
}

while ($reader.Read()) {
  $total++

  $rowId     = $reader["Database1"]
  $jobNumber = "$($reader["Job Number"])".Trim()
  $testDate  = $reader["Test Date"]
  $operator  = "$($reader["Operator"])".Trim()

  if ([string]::IsNullOrWhiteSpace($jobNumber)) { $skipped++; continue }

  $dateStr = ''
  try {
    $dateStr = ([datetime]$testDate).ToString('yyyy-MM-dd')
  } catch {
    $skipped++
    continue
  }

  # Average card (baseline) thickness
  $avgCard = SafeAvg $reader["Card Thickness A"] $reader["Card Thickness B"] $reader["Card Thickness C"]
  if ($avgCard -eq $null) { $skipped++; continue }

  # Hologram delta
  $avgHolo     = SafeAvg $reader["Hologram Thickness A"] $reader["Hologram Thickness B"] $reader["Hologram Thickness C"]
  $holoDelta   = if ($avgHolo -ne $null) { [math]::Round($avgHolo - $avgCard, 4) } else { $null }

  # Signature panel delta
  $avgSig      = SafeAvg $reader["Sig Panel Thickness A"] $reader["Sig Panel Thickness B"] $reader["Sig Panel Thickness C"]
  $sigDelta    = if ($avgSig -ne $null) { [math]::Round($avgSig - $avgCard, 4) } else { $null }

  # Skip rows with no add-on data at all
  if ($holoDelta -eq $null -and $sigDelta -eq $null) { $skipped++; continue }

  $holoPass = if ($holoDelta -ne $null) { $holoDelta -le $USL } else { $null }
  $sigPass  = if ($sigDelta  -ne $null) { $sigDelta  -le $USL } else { $null }

  $results += @{
    rowId         = [int]$rowId
    jobNumber     = $jobNumber
    testDate      = $dateStr
    operator      = $operator
    avgCardMm     = $avgCard
    holoDelta     = $holoDelta
    sigPanelDelta = $sigDelta
    holoPass      = $holoPass
    sigPass       = $sigPass
  }
}

$reader.Close()
$conn.Close()

$results | ConvertTo-Json -Depth 3 | Set-Content -Path $outPath -Encoding UTF8

Write-Host "Done. Exported: $($results.Count) sessions | Skipped: $skipped | Total rows: $total"
Write-Host "Output: $outPath"
