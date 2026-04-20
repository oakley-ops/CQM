# Export height monitoring data from Access DB to JSON
# Run: powershell -ExecutionPolicy Bypass -File export-height-accdb.ps1

$dbPath  = "C:\Users\Quali\CQM\NEWESTUpdatedCard Dimension Log 1.23.17181.accdb"
$outPath = "C:\Users\Quali\CQM\backend\scripts\data\height-monitoring.json"

$LSL = -0.13
$USL =  0.13

$dir = Split-Path $outPath
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;" + "Data Source=" + $dbPath + ";"
$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
$conn.Open()

$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT * FROM [Sheet1] ORDER BY TestDate ASC, Time ASC"
$reader = $cmd.ExecuteReader()

$results = @()
$skipped = 0
$total   = 0

while ($reader.Read()) {
  $total++
  $jobNumber = "$($reader['JobNumber'])".Trim()
  $testDate  = $reader['TestDate']
  $operator  = "$($reader['Operator'])".Trim()

  if ([string]::IsNullOrWhiteSpace($jobNumber)) { $skipped++; continue }

  $dateStr = ''
  try {
    $dateStr = ([datetime]$testDate).ToString('yyyy-MM-dd')
  } catch {
    $skipped++
    continue
  }

  $cards = @()
  for ($i = 1; $i -le 10; $i++) {
    $val = $reader["Card${i}Height"]

    if ($val -eq $null -or $val -eq [DBNull]::Value -or "$val".Trim() -eq '') { continue }

    $num  = [double]$val
    $pass = ($num -ge $LSL -and $num -le $USL)

    $cards += @{ cardNumber = $i; heightMm = $num; pass = $pass }
  }

  if ($cards.Count -eq 0) { $skipped++; continue }

  $results += @{
    jobNumber = $jobNumber
    testDate  = $dateStr
    operator  = $operator
    cards     = $cards
  }
}

$reader.Close()
$conn.Close()

$results | ConvertTo-Json -Depth 5 | Set-Content -Path $outPath -Encoding UTF8

Write-Host "Done. Exported: $($results.Count) sessions | Skipped: $skipped | Total rows: $total"
Write-Host "Output: $outPath"
