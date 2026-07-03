const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    startSearch,
    getLatestSearch,
    getMatches,
    dismissMatch,
    createCoverLetter,
    createSuggestions,
    trackMatch,
} = require('../controllers/jobController');

// All job-finder routes require authentication
router.use(authMiddleware);

// @route   POST /api/jobs/search
// @desc    Start an AI job discovery run for a resume + interests
router.post('/search', startSearch);

// @route   GET /api/jobs/search/latest
// @desc    Status of the most recent discovery run
router.get('/search/latest', getLatestSearch);

// @route   GET /api/jobs
// @desc    Get matched openings for the logged-in user
router.get('/', getMatches);

// @route   PUT /api/jobs/:id/dismiss
router.put('/:id/dismiss', dismissMatch);

// @route   POST /api/jobs/:id/cover-letter
// @desc    Generate a personalized LaTeX cover letter for an opening
router.post('/:id/cover-letter', createCoverLetter);

// @route   POST /api/jobs/:id/suggestions
// @desc    Resume improvement suggestions targeted at an opening
router.post('/:id/suggestions', createSuggestions);

// @route   POST /api/jobs/:id/track
// @desc    Add the opening to the Applied board
router.post('/:id/track', trackMatch);

module.exports = router;
