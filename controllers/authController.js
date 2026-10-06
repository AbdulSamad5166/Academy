import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';

export const login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both username and password.'
    });
  }

  const query = `SELECT * FROM teachers WHERE LOWER(username) = LOWER(?)`;
  db.get(query, [username.trim()], async (err, teacher) => {
    if (err) {
      console.error('Database query error during login:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.'
      });
    }

    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    // Create JWT token (valid for 7 days)
    const payload = {
      id: teacher.id,
      username: teacher.username,
      name: teacher.name,
      academy_name: teacher.academy_name
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Login successful! Welcome back, ' + teacher.name,
      token,
      teacher: {
        id: teacher.id,
        username: teacher.username,
        name: teacher.name,
        academy_name: teacher.academy_name
      }
    });
  });
};

export const logout = (req, res) => {
  res.clearCookie('token');
  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
};

export const getMe = (req, res) => {
  if (!req.teacher) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  return res.json({
    success: true,
    teacher: req.teacher
  });
};
