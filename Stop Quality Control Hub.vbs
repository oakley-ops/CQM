Set objShell = CreateObject("WScript.Shell")

objShell.Run "cmd /c ""for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %a""", 0, True
objShell.Run "cmd /c ""for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :5000') do taskkill /f /pid %a""", 0, True
objShell.Run "cmd /c ""taskkill /f /im nginx.exe >nul 2>&1""", 0, True

MsgBox "Quality Control Hub stopped.", 64, "Quality Control Hub"
