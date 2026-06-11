const db = require('../config/db');
const google = require('googlethis');

// Get all applications for a user
exports.getApplications = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM applications WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add a new application and fetch link automatically
exports.addApplication = async (req, res) => {
    try {
        const { company, role, status, link: providedLink, created_at } = req.body;
        
        if (!company || !role) {
            return res.status(400).json({ message: 'Company and Role are required' });
        }

        let finalLink = providedLink || '';
        
        // If link not provided, search for it
        if (!finalLink) {
            const searchQuery = `${company} ${role} careers application`;
            finalLink = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
            
            try {
                console.log(`Searching web for: ${searchQuery}`);
                const options = { page: 0, safe: false, additional_params: { hl: 'en' } };
                const response = await google.search(searchQuery, options);
                if (response.results && response.results.length > 0) {
                    finalLink = response.results[0].url;
                }
            } catch (searchErr) {
                console.error('Google Search scraping blocked, using fallback URL:', searchErr.message);
            }
        }

        let query = 'INSERT INTO applications (user_id, company, role, status, link) VALUES ($1, $2, $3, $4, $5) RETURNING *';
        let params = [req.user.id, company, role, status || 'Applied', finalLink];

        // If a specific date was provided, include it in the query
        if (created_at) {
            query = 'INSERT INTO applications (user_id, company, role, status, link, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
            params.push(created_at);
        }

        const result = await db.query(query, params);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding application:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update an application (e.g. status)
exports.updateApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const { company, role, status, link } = req.body;

        // Verify ownership
        const checkResult = await db.query('SELECT user_id FROM applications WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }
        if (checkResult.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const result = await db.query(
            `UPDATE applications 
             SET company = COALESCE($1, company), 
                 role = COALESCE($2, role), 
                 status = COALESCE($3, status), 
                 link = COALESCE($4, link),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 RETURNING *`,
            [company, role, status, link, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete an application
exports.deleteApplication = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const checkResult = await db.query('SELECT user_id FROM applications WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }
        if (checkResult.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await db.query('DELETE FROM applications WHERE id = $1', [id]);
        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
