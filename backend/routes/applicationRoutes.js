const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
    getApplications, 
    addApplication, 
    updateApplication, 
    deleteApplication 
} = require('../controllers/applicationController');

// All application routes require authentication
router.use(authMiddleware);

// @route   GET /api/applications
// @desc    Get all applications for the logged-in user
router.get('/', getApplications);

// @route   POST /api/applications
// @desc    Add a new application
router.post('/', addApplication);

// @route   PUT /api/applications/:id
// @desc    Update an existing application
router.put('/:id', updateApplication);

// @route   DELETE /api/applications/:id
// @desc    Delete an application
router.delete('/:id', deleteApplication);

module.exports = router;
