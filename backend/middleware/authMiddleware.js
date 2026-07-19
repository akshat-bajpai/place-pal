const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');

module.exports = (req, res, next) => {
    // Get token from header
    const token = req.header('Authorization');

    // Check if not token
    if (!token) {
        return next(new AppError('No token, authorization denied', 401));
    }

    try {
        // Verify token. Expecting format "Bearer <token>"
        const tokenString = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
        const decoded = jwt.verify(tokenString, env.jwtSecret);

        req.user = decoded.user;
        next();
    } catch (err) {
        next(new AppError('Token is not valid', 401));
    }
};
