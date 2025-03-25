// middleware/requireRole.js
export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
      // Ensure the user has been authenticated (i.e. verifyToken middleware has set req.user)
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated.' });
      }
      
      // Use req.user.role if available, otherwise fallback to req.user.userType (as set in your JWT)
      const userRole = req.user.role || req.user.userType;
      
      // Check if the user's role is included in the allowed roles
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
      }
      
      next();
    };
  };
  