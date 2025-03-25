import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  
  const token = authHeader.split(' ')[1]; // Get the token part after "Bearer"
  if (!token) {
    return res.status(401).json({ error: 'Token missing from Authorization header.' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, decoded) => {
    if (err) {
      console.error('Token verification failed:', err);
      return res.status(403).json({ error: 'Invalid token.' });
    }
    req.user = decoded; // For example, { userId, userType, iat, exp }
    next();
  });
};
