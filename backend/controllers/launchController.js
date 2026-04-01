const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

// Use cmd /c start to launch the VBS — this calls ShellExecute (same as double-clicking),
// which passes foreground permission to wscript so AppActivate works on Windows 11.
const VBS_PATH = path.join(__dirname, '..', 'scripts', 'launch_smartqc.vbs');

exports.launchSmartQC = (req, res) => {
  try {
    const child = spawn('cmd.exe', ['/c', 'start', '""', VBS_PATH], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();

    logger.info(`SmartQC launched by user ${req.user?.id}`);
    res.json({ success: true, message: 'SmartQC launched' });
  } catch (error) {
    logger.error('Failed to launch SmartQC:', error);
    res.status(500).json({ success: false, message: 'Failed to launch SmartQC', error: error.message });
  }
};
