const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const testCategoryController = require('../controllers/testCategoryController');

/**
 * @swagger
 * /api/test-categories:
 *   get:
 *     summary: Get all test categories
 *     tags: [Test Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cardType
 *         schema:
 *           type: string
 *         description: Filter by card type (ICM, CB, ICC, PICC)
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *         description: Only return active categories
 *     responses:
 *       200:
 *         description: List of test categories
 */
router.get('/', authenticate, testCategoryController.getCategories);

/**
 * @swagger
 * /api/test-categories/{id}:
 *   get:
 *     summary: Get a test category with its definitions
 *     tags: [Test Categories]
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
 *         description: Test category details
 */
router.get('/:id', authenticate, testCategoryController.getCategory);

/**
 * @swagger
 * /api/test-categories/by-card-type/{cardType}:
 *   get:
 *     summary: Get categories filtered by card type
 *     tags: [Test Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of categories for the card type
 */
router.get('/by-card-type/:cardType', authenticate, testCategoryController.getCategoriesByCardType);

/**
 * @swagger
 * /api/test-categories/{id}/definitions:
 *   get:
 *     summary: Get test definitions for a category
 *     tags: [Test Categories]
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
 *         description: List of test definitions
 */
router.get('/:id/definitions', authenticate, testCategoryController.getDefinitionsByCategory);

module.exports = router;
