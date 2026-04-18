# Export thickness monitoring data from Access DB to JSON
# Run: powershell -ExecutionPolicy Bypass -File export-thickness-accdb.ps1

$dbPath = "C:\Users\Quali\CQM\NEWESTUpdatedCard Dimension Log 1.23.17181.accdb"
$outPath = "C:\Users\Quali\CQM\backend\scripts\data\thickness-monitoring.json"

# Ensure output directory exists
$dir = Split-Path $outPath
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$conn = New-Object System.Data.OleDb.OleDbConnection(
  "Provider=Microsoft.ACE.OLEDB.12.0;Data Source='$dbPath';"
)
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

  if ([string]::IsNullOrWhiteSpace($jobNumber) -or $jobNumber -eq '') {
    $skipped++
    continue
  }

  # Parse date
  $dateStr = ''
  try {
    $d = [datetime]$testDate
    $dateStr = $d.ToString('yyyy-MM-dd')
  } catch {
    $skipped++
    continue
  }

  $cards = @()
  for ($i = 1; $i -le 10; $i++) {
    $a = $reader["Card${i}ThickA"]
    $b = $reader["Card${i}ThickB"]
    $c = $reader["Card${i}ThickC"]
    $d = $reader["Card${i}ThickD"]

    # Skip blank cards
    $vals = @($a, $b, $c, $d) | Where-Object {
      $_ -ne $null -and $_ -ne [DBNull]::Value -and "$_".Trim() -ne ''
    }
    if ($vals.Count -eq 0) { continue }

    $nums = $vals | ForEach-Object { [double]$_ }
    $avg  = [math]::Round(($nums | Measure-Object -Average).Average, 4)
    $pass = ($avg -ge 0.76 -and $avg -le 0.84)

    $cards += @{
      cardNumber = $i
      thickAvg   = $avg
      pass       = $pass
    }
  }

  if ($cards.Count -eq 0) {
    $skipped++
    continue
  }

  $results += @{
    jobNumber = $jobNumber
    testDate  = $dateStr
    operator  = $operator
    cards     = $cards
  }
}

$reader.Close()
$conn.Close()

$json = $results | ConvertTo-Json -Depth 5
Set-Content -Path $outPath -Value $json -Encoding UTF8

Write-Host "Done. Exported: $($results.Count) sessions | Skipped: $skipped | Total rows: $total"
Write-Host "Output: $outPath"
