const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Token verification failed' 
      });
    }
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
}

function requireOwnership(req, res, next) {
  const userId = req.params.id || req.params.userId;
  
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied: You can only access your own data' 
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOwnership
};
