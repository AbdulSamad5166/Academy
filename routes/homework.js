import express from 'express';
import {
  getAllHomework,
  getHomeworkByCodeOrId,
  createHomework,
  updateHomework,
  deleteHomework,
  getStats,
  getFilters
} from '../controllers/homeworkController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllHomework);
router.get('/filters', getFilters);
router.get('/stats', authenticateToken, getStats);
router.get('/:idOrCode', getHomeworkByCodeOrId);

// Protected routes (Teacher only)
router.post('/', authenticateToken, upload.single('attachment'), createHomework);
router.put('/:idOrCode', authenticateToken, upload.single('attachment'), updateHomework);
router.delete('/:idOrCode', authenticateToken, deleteHomework);

export default router;
