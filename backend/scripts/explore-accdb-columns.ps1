# Explore column names in both Access DB files
# Run: powershell -ExecutionPolicy Bypass -File explore-accdb-columns.ps1

$files = @(
  "C:\Users\Quali\CQM\NEWESTUpdatedCard Dimension Log 1.23.17181.accdb",
  "C:\Users\Quali\CQM\Card Add on 2019511.accdb"
)

foreach ($dbPath in $files) {
  Write-Host ""
  Write-Host "=======================================================" -ForegroundColor Cyan
  Write-Host "FILE: $dbPath" -ForegroundColor Cyan
  Write-Host "=======================================================" -ForegroundColor Cyan

  if (!(Test-Path $dbPath)) {
    Write-Host "  !! File not found -- skipping" -ForegroundColor Red
    continue
  }

  $connStr = "Provider=Microsoft.ACE.OLEDB.12.0;" + "Data Source=" + $dbPath + ";"
  $conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
  $conn.Open()

  $tables = $conn.GetSchema("Tables") |
    Where-Object { $_.TABLE_TYPE -eq "TABLE" } |
    Select-Object -ExpandProperty TABLE_NAME

  Write-Host "Tables: $($tables -join ', ')" -ForegroundColor Yellow

  foreach ($table in $tables) {
    Write-Host ""
    Write-Host "  -- Table: [$table] --" -ForegroundColor Green

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT TOP 1 * FROM [$table]"
    $reader = $cmd.ExecuteReader()

    Write-Host "  Columns:" -ForegroundColor DarkCyan
    for ($i = 0; $i -lt $reader.FieldCount; $i++) {
      Write-Host ("    {0,-3} {1}" -f $i, $reader.GetName($i))
    }

    $reader.Close()

    # Print first 3 data rows (non-null values only)
    Write-Host ""
    Write-Host "  Sample data (first 3 rows, non-empty fields):" -ForegroundColor DarkCyan
    $cmd2 = $conn.CreateCommand()
    $cmd2.CommandText = "SELECT TOP 3 * FROM [$table]"
    $r2 = $cmd2.ExecuteReader()
    $rowNum = 0
    while ($r2.Read()) {
      $rowNum++
      Write-Host "  --- Row $rowNum ---" -ForegroundColor DarkGray
      for ($i = 0; $i -lt $r2.FieldCount; $i++) {
        $val = $r2.GetValue($i)
        if ($val -ne $null -and $val -ne [DBNull]::Value -and "$val".Trim() -ne "") {
          Write-Host ("    {0,-40} = {1}" -f $r2.GetName($i), $val)
        }
      }
    }
    $r2.Close()
  }

  $conn.Close()
}

Write-Host ""
Write-Host "Done." -ForegroundColor Cyan
