const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const testEntryController = require('../controllers/testEntryController');

/**
 * @swagger
 * /api/test-entries:
 *   post:
 *     summary: Create or update a test entry
 *     tags: [Test Entries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - testDefinitionId
 *             properties:
 *               sessionId:
 *                 type: integer
 *               testDefinitionId:
 *                 type: integer
 *               measurementValue:
 *                 type: number
 *               assessmentValue:
 *                 type: string
 *                 enum: [Excellent, Good, Acceptable, Poor]
 *               passStatus:
 *                 type: boolean
 *               multiValueNotes:
 *                 type: string
 *               notes:
 *                 type: string
 *               retestRequired:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Test entry created/updated
 */
router.post('/', authenticate, testEntryController.createOrUpdateEntry);

/**
 * @swagger
 * /api/test-entries/bulk:
 *   post:
 *     summary: Bulk save test entries for a session
 *     tags: [Test Entries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - entries
 *             properties:
 *               sessionId:
 *                 type: integer
 *               entries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     testDefinitionId:
 *                       type: integer
 *                     measurementValue:
 *                       type: number
 *                     assessmentValue:
 *                       type: string
 *                     passStatus:
 *                       type: boolean
 *                     notes:
 *                       type: string
 *                     retestRequired:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Test entries saved
 */
router.post('/bulk', authenticate, testEntryController.bulkSaveEntries);

/**
 * @swagger
 * /api/test-entries/session/{sessionId}:
 *   get:
 *     summary: Get all entries for a session
 *     tags: [Test Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of test entries
 */
router.get('/session/:sessionId', authenticate, testEntryController.getEntriesBySession);

/**
 * @swagger
 * /api/test-entries/{id}:
 *   delete:
 *     summary: Delete a test entry
 *     tags: [Test Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Test entry deleted
 */
router.delete('/:id', authenticate, testEntryController.deleteEntry);

module.exports = router;
