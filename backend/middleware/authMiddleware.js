const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Get token from header
    const token = req.header('Authorization');

    // Check if not token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // Verify token. Expecting format "Bearer <token>"
        const tokenString = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
        const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);

        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
