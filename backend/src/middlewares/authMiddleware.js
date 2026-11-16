const { auth } = require('../config/firebase');

/**
 * Verify Firebase ID Token from Authorization header: "Bearer <token>"
 */
const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. No Bearer token provided.' 
      });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Empty authentication token provided.' 
      });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.warn('Auth token verification error:', error.message);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired authentication token. Please sign in again.' 
    });
  }
};

/**
 * Optional Auth: populates req.user if a valid token is provided,
 * but allows the request to continue gracefully if unauthenticated.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1].trim();
      if (token) {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken;
      }
    }
  } catch (error) {
    // Continue without setting req.user
  }
  next();
};

module.exports = { verifyAuth, optionalAuth };
