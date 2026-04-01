Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class Win32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  }
"@

$logFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "launch_smartqc.log")
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$proc = Get-Process -Name SmartQC -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1

if ($proc) {
  Add-Content $logFile "$timestamp already running, activating (HWND=$($proc.MainWindowHandle))"
} else {
  $exe = "C:\Smartware\SmartQC\SmartQC.exe"
  $dir = "C:\Smartware\SmartQC"
  Add-Content $logFile "$timestamp launching `"$exe`""
  Start-Process -FilePath $exe -WorkingDirectory $dir -WindowStyle Normal

  $attempts = 0
  do {
    Start-Sleep -Milliseconds 500
    $proc = Get-Process -Name SmartQC -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
    $attempts++
  } while (-not $proc -and $attempts -lt 20)

  if (-not $proc) {
    Add-Content $logFile "$timestamp timed out waiting for SmartQC window after $attempts attempts"
    exit 1
  }
  Add-Content $logFile "$timestamp window ready after $attempts attempts (HWND=$($proc.MainWindowHandle))"
}

[Win32]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null   # SW_RESTORE (9) un-minimizes
[Win32]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
Add-Content $logFile "$timestamp foreground activated"
