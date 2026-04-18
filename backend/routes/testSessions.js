const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const testSessionController = require('../controllers/testSessionController');

/**
 * @swagger
 * /api/test-sessions:
 *   get:
 *     summary: Get all test sessions with pagination
 *     tags: [Test Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, submitted, approved, rejected]
 *       - in: query
 *         name: cardType
 *         schema:
 *           type: string
 *       - in: query
 *         name: batchLotNumber
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of test sessions
 */
router.get('/', authenticate, testSessionController.getSessions);

/**
 * @swagger
 * /api/test-sessions/{id}:
 *   get:
 *     summary: Get a test session with all entries
 *     tags: [Test Sessions]
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
 *         description: Test session details with entries
 */
router.get('/management-report', authenticate, testSessionController.exportManagementReport);
router.get('/qualification-status', authenticate, testSessionController.getQualificationStatus);

router.get('/:id', authenticate, testSessionController.getSession);

/**
 * @swagger
 * /api/test-sessions:
 *   post:
 *     summary: Create a new test session
 *     tags: [Test Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cardType
 *               - manufacturingStage
 *               - batchLotNumber
 *             properties:
 *               cardType:
 *                 type: string
 *               manufacturingStage:
 *                 type: string
 *               batchLotNumber:
 *                 type: string
 *               cardSerialNumber:
 *                 type: string
 *               testDate:
 *                 type: string
 *                 format: date
 *               equipmentId:
 *                 type: string
 *               generalNotes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Test session created
 */
router.post('/', authenticate, testSessionController.createSession);

/**
 * @swagger
 * /api/test-sessions/{id}:
 *   put:
 *     summary: Update a test session
 *     tags: [Test Sessions]
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
 *         description: Test session updated
 */
router.put('/:id', authenticate, testSessionController.updateSession);

/**
 * @swagger
 * /api/test-sessions/{id}:
 *   delete:
 *     summary: Delete a draft test session
 *     tags: [Test Sessions]
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
 *         description: Test session deleted
 */
router.delete('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER), testSessionController.deleteSession);

/**
 * @swagger
 * /api/test-sessions/{id}/submit:
 *   put:
 *     summary: Submit a test session for approval
 *     tags: [Test Sessions]
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
 *         description: Test session submitted
 */
router.put('/:id/submit', authenticate, testSessionController.submitSession);

/**
 * @swagger
 * /api/test-sessions/{id}/approve:
 *   put:
 *     summary: Approve a submitted test session
 *     tags: [Test Sessions]
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
 *         description: Test session approved
 */
router.put('/:id/approve', authenticate, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER), testSessionController.approveSession);

/**
 * @swagger
 * /api/test-sessions/{id}/reject:
 *   put:
 *     summary: Reject a submitted test session
 *     tags: [Test Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test session rejected
 */
router.put('/:id/reject', authenticate, authorize(ROLES.ADMIN, ROLES.QUALITY_MANAGER), testSessionController.rejectSession);
router.put('/:id/reopen', authenticate, testSessionController.reopenSession);

/**
 * @swagger
 * /api/test-sessions/{id}/export-pdf:
 *   get:
 *     summary: Export test session as PDF report
 *     tags: [Test Sessions]
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
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/export-pdf', authenticate, testSessionController.exportPDF);
router.get('/:id/export-report', authenticate, testSessionController.exportProfessionalReport);

module.exports = router;
