import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { initDatabase } from './database/db.js';
import authRoutes from './routes/auth.js';
import homeworkRoutes from './routes/homework.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Ensure directories exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static file serving
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/homework', homeworkRoutes);

// Friendly URL routing for clean student & teacher pages
app.get('/homework/:idOrCode', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'homework.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/add-homework', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'add-homework.html'));
});

app.get('/edit-homework', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'edit-homework.html'));
});

app.get('/edit-homework/:idOrCode', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'edit-homework.html'));
});

// Fallback to home
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized error handler (including Multer error handling)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'The uploaded file is too large. Maximum allowed size is 30 MB.'
      });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  return res.status(500).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.'
  });
});

// Initialize database and start listening
initDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`===============================================`);
      console.log(`Tuition Academy Homework Hub is running!`);
      console.log(`URL: http://localhost:${PORT}`);
      console.log(`Teacher Login: http://localhost:${PORT}/login.html`);
      console.log(`===============================================`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
