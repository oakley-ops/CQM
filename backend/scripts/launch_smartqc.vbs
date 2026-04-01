Dim sh : Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Smartware\SmartQC"
sh.Run """C:\Smartware\SmartQC\SmartQC.exe""", 1, False
WScript.Sleep 2000
sh.AppActivate "SmartQC"
