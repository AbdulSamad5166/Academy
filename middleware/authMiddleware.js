import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'apex-tuition-secret-key-2025';

export function authenticateToken(req, res, next) {
  // Check authorization header or cookie
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.split(' ')[1];
  const tokenFromCookie = req.cookies && req.cookies.token;

  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please log in as a teacher.'
    });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.teacher = verified;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.'
    });
  }
}

export { JWT_SECRET };
