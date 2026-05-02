Set objShell = CreateObject("WScript.Shell")

objShell.Run "cmd /c ""cd /d C:\Users\Quali\CQM\backend && npm run dev""", 0, False

WScript.Sleep 3000

objShell.Run "cmd /c ""cd /d C:\Users\Quali\CQM\frontend && npm run dev""", 0, False

WScript.Sleep 5000

objShell.Run "http://localhost:3000"
