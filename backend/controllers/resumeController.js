const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const { evaluateResume } = require('../utils/atsScorer');

// Upload a new resume version
exports.uploadResume = async (req, res) => {
    try {
        const { version_name, target_role, academic_year } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        if (!version_name) {
            // Cleanup the uploaded file if version_name is missing
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Version name is required' });
        }

        const file_path = `/uploads/${req.file.filename}`;

        // 1. Instantly insert into DB with ats_score = -1 (Pending)
        const result = await db.query(
            'INSERT INTO resumes (user_id, version_name, file_path, ats_score, ats_feedback, target_role, academic_year) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [req.user.id, version_name, file_path, -1, null, target_role || 'General', academic_year || '3rd Year']
        );
        const newResume = result.rows[0];

        // 2. Respond to the frontend instantly
        res.status(201).json(newResume);

        // 3. Process ATS Score asynchronously in the background
        (async () => {
            try {
                const pdfBuffer = fs.readFileSync(req.file.path);
                const evaluation = await evaluateResume(pdfBuffer, target_role || 'General', academic_year || '3rd Year');
                
                await db.query(
                    'UPDATE resumes SET ats_score = $1, ats_feedback = $2 WHERE id = $3',
                    [evaluation.overall_score, JSON.stringify(evaluation), newResume.id]
                );
            } catch (evalError) {
                console.error('Background ATS evaluation failed:', evalError);
                await db.query(
                    'UPDATE resumes SET ats_score = 0, ats_feedback = $1 WHERE id = $2',
                    [JSON.stringify({ strengths: [], weaknesses: ["Fatal error during background processing.", "Error: " + evalError.message], suggestions: ["Please delete and try again."] }), newResume.id]
                );
            }
        })();
    } catch (error) {
        console.error('Error uploading resume:', error);
        // If there was an error saving to DB, try to clean up the file
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all resumes for the authenticated user
exports.getResumes = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM resumes WHERE user_id = $1 ORDER BY is_starred DESC, created_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching resumes:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a resume version
exports.deleteResume = async (req, res) => {
    try {
        const { id } = req.params;

        // First find the resume to get the file path
        const findResult = await db.query(
            'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (findResult.rows.length === 0) {
            return res.status(404).json({ message: 'Resume not found' });
        }

        const resume = findResult.rows[0];

        // Delete from database
        await db.query(
            'DELETE FROM resumes WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        // Delete the actual file from the filesystem
        const fullPath = path.join(__dirname, '..', resume.file_path);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        res.json({ message: 'Resume deleted successfully' });
    } catch (error) {
        console.error('Error deleting resume:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Star a resume version (unstars all others)
exports.starResume = async (req, res) => {
    try {
        const { id } = req.params;

        // Start transaction
        await db.query('BEGIN');

        // Verify the resume exists and belongs to the user
        const findResult = await db.query(
            'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (findResult.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ message: 'Resume not found' });
        }

        // Unstar all resumes for this user
        await db.query(
            'UPDATE resumes SET is_starred = false WHERE user_id = $1',
            [req.user.id]
        );

        // Star the selected resume
        const updateResult = await db.query(
            'UPDATE resumes SET is_starred = true WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.id]
        );

        await db.query('COMMIT');
        
        res.json(updateResult.rows[0]);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error starring resume:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
