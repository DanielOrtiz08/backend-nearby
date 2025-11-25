const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const isOwner = (req, res, next) => {
    if (req.user.user_type !== 'owner') {
        return res.status(403).json({ error: 'Access denied. Owner account required.' });
    }
    next();
};

const isStudent = (req, res, next) => {
    if (req.user.user_type !== 'student') {
        return res.status(403).json({ error: 'Access denied. Student account required.' });
    }
    next();
};

module.exports = { authMiddleware, isOwner, isStudent };
