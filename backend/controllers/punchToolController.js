const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const logger = require('../utils/logger');

/** GET /api/punch-tools — list all active punch tools */
const listPunchTools = async (req, res) => {
  try {
    const rows = await sequelize.query(
      'SELECT id, serial_number, description, is_active, created_at FROM punch_tools WHERE is_active = TRUE ORDER BY serial_number ASC',
      { type: QueryTypes.SELECT }
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('listPunchTools error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch punch tools' });
  }
};

/** POST /api/punch-tools — add a new punch tool serial number */
const createPunchTool = async (req, res) => {
  const { serialNumber, description } = req.body;
  if (!serialNumber || !serialNumber.trim()) {
    return res.status(400).json({ success: false, message: 'serialNumber is required' });
  }
  try {
    const rows = await sequelize.query(
      `INSERT INTO punch_tools (serial_number, description)
       VALUES (:serial, :desc)
       ON CONFLICT (serial_number) DO UPDATE SET is_active = TRUE, updated_at = NOW()
       RETURNING id, serial_number, description, is_active, created_at`,
      {
        replacements: {
          serial: serialNumber.trim().toUpperCase(),
          desc: description?.trim() || null,
        },
        type: QueryTypes.SELECT,
      }
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    logger.error('createPunchTool error:', err);
    res.status(500).json({ success: false, message: 'Failed to save punch tool' });
  }
};

/** PATCH /api/punch-tools/:id/deactivate — soft-delete a punch tool */
const deactivatePunchTool = async (req, res) => {
  try {
    const [, meta] = await sequelize.query(
      'UPDATE punch_tools SET is_active = FALSE, updated_at = NOW() WHERE id = :id',
      { replacements: { id: req.params.id }, type: QueryTypes.UPDATE }
    );
    if (meta === 0) return res.status(404).json({ success: false, message: 'Punch tool not found' });
    res.json({ success: true });
  } catch (err) {
    logger.error('deactivatePunchTool error:', err);
    res.status(500).json({ success: false, message: 'Failed to deactivate punch tool' });
  }
};

module.exports = { listPunchTools, createPunchTool, deactivatePunchTool };
