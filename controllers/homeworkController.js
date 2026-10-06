import db from '../database/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../uploads');

// Calculate homework status
export function calculateStatus(deadlineDateStr) {
  if (!deadlineDateStr) return { status: 'active', label: 'Active', daysRemaining: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = deadlineDateStr.split('-').map(Number);
  const deadline = new Date(year, month - 1, day);
  deadline.setHours(23, 59, 59, 999);

  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0 || (deadline.getTime() < Date.now())) {
    return {
      status: 'passed',
      label: 'Deadline Passed',
      badgeClass: 'badge-passed',
      daysRemaining: diffDays
    };
  } else if (diffDays <= 1) {
    return {
      status: 'due-soon',
      label: 'Due Soon',
      badgeClass: 'badge-due-soon',
      daysRemaining: diffDays
    };
  } else {
    return {
      status: 'active',
      label: 'Active',
      badgeClass: 'badge-active',
      daysRemaining: diffDays
    };
  }
}

// Generate unique short code for shareable link
function generateUniqueCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = 'hw-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Format homework record with full attributes
function formatHomework(hw, req) {
  const protocol = req ? (req.headers['x-forwarded-proto'] || req.protocol) : 'http';
  const host = req ? (req.headers['x-forwarded-host'] || req.headers.host) : 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;
  const shareableUrl = `${baseUrl}/homework/${hw.code}`;

  const statusInfo = calculateStatus(hw.deadline_date);

  // Parse YouTube video ID if applicable
  let youtubeEmbedUrl = null;
  if (hw.video_url) {
    const ytMatch = hw.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      youtubeEmbedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
  }

  // File download URL
  const fileUrl = hw.file_name ? `${baseUrl}/uploads/${hw.file_name}` : null;

  // Prepared WhatsApp text
  const whatsappMessage = 
`*New Homework*\n\n` +
`*Class:* ${hw.class_name}\n` +
`*Subject:* ${hw.subject}\n` +
`*Homework:* ${hw.title}\n` +
`*Deadline:* ${hw.deadline_date}\n\n` +
`*View Homework:*\n` +
`${shareableUrl}`;

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

  return {
    ...hw,
    status: statusInfo.status,
    statusLabel: statusInfo.label,
    badgeClass: statusInfo.badgeClass,
    daysRemaining: statusInfo.daysRemaining,
    shareableUrl,
    fileUrl,
    youtubeEmbedUrl,
    whatsappMessage,
    whatsappShareUrl
  };
}

// GET all homework (Public & Teacher, with filters)
export const getAllHomework = (req, res) => {
  const { search, className, subject, status } = req.query;

  let sql = `SELECT * FROM homework WHERE 1=1`;
  const params = [];

  if (search && search.trim() !== '') {
    const term = `%${search.trim()}%`;
    sql += ` AND (title LIKE ? OR description LIKE ? OR subject LIKE ? OR class_name LIKE ?)`;
    params.push(term, term, term, term);
  }

  if (className && className !== 'all') {
    sql += ` AND class_name = ?`;
    params.push(className);
  }

  if (subject && subject !== 'all') {
    sql += ` AND subject = ?`;
    params.push(subject);
  }

  sql += ` ORDER BY created_at DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Error fetching homework list:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve homework.' });
    }

    let formattedList = rows.map(r => formatHomework(r, req));

    // Filter by calculated status if requested
    if (status && status !== 'all') {
      formattedList = formattedList.filter(item => item.status === status);
    }

    return res.json({
      success: true,
      count: formattedList.length,
      homework: formattedList
    });
  });
};

// GET single homework by code or id (Public & Teacher)
export const getHomeworkByCodeOrId = (req, res) => {
  const { idOrCode } = req.params;

  const sql = `SELECT * FROM homework WHERE code = ? OR id = ?`;
  db.get(sql, [idOrCode, idOrCode], (err, row) => {
    if (err) {
      console.error('Error fetching homework detail:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve homework details.' });
    }

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Homework not found. It may have been removed or the link is invalid.'
      });
    }

    const homework = formatHomework(row, req);
    return res.json({
      success: true,
      homework
    });
  });
};

// GET Dashboard statistics
export const getStats = (req, res) => {
  const sql = `SELECT * FROM homework`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error getting stats:', err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve stats.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    let total = rows.length;
    let uploadedToday = 0;
    let active = 0;
    let dueSoon = 0;
    let deadlinePassed = 0;

    rows.forEach(r => {
      // Check created today or homework_date today
      const createdDateStr = r.created_at ? r.created_at.split(' ')[0] : '';
      if (r.homework_date === todayStr || createdDateStr === todayStr) {
        uploadedToday++;
      }

      const st = calculateStatus(r.deadline_date);
      if (st.status === 'active') active++;
      else if (st.status === 'due-soon') dueSoon++;
      else if (st.status === 'passed') deadlinePassed++;
    });

    return res.json({
      success: true,
      stats: {
        total,
        uploadedToday,
        active,
        dueSoon,
        deadlinePassed
      }
    });
  });
};

// GET distinct classes and subjects for filter dropdowns
export const getFilters = (req, res) => {
  const sql = `SELECT DISTINCT class_name, subject FROM homework`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error getting filters:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch filters.' });
    }

    const classes = [...new Set(rows.map(r => r.class_name).filter(Boolean))].sort();
    const subjects = [...new Set(rows.map(r => r.subject).filter(Boolean))].sort();

    return res.json({
      success: true,
      classes,
      subjects
    });
  });
};

// POST create new homework (Teacher only)
export const createHomework = (req, res) => {
  const {
    title,
    class_name,
    subject,
    description,
    homework_date,
    deadline_date,
    video_url
  } = req.body;

  if (!title || !class_name || !subject || !description || !homework_date || !deadline_date) {
    return res.status(400).json({
      success: false,
      message: 'Please fill in all required fields (title, class, subject, description, dates).'
    });
  }

  const code = generateUniqueCode();

  let file_name = null;
  let file_original_name = null;
  let file_size = null;
  let file_mimetype = null;

  if (req.file) {
    file_name = req.file.filename;
    file_original_name = req.file.originalname;
    file_size = req.file.size;
    file_mimetype = req.file.mimetype;
  }

  const cleanVideoUrl = video_url && video_url.trim() !== '' ? video_url.trim() : null;

  const sql = `
    INSERT INTO homework (
      code, title, class_name, subject, description, homework_date, deadline_date,
      file_name, file_original_name, file_size, file_mimetype, video_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    code,
    title.trim(),
    class_name.trim(),
    subject.trim(),
    description.trim(),
    homework_date,
    deadline_date,
    file_name,
    file_original_name,
    file_size,
    file_mimetype,
    cleanVideoUrl
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error inserting homework:', err);
      return res.status(500).json({ success: false, message: 'Failed to create homework.' });
    }

    const newId = this.lastID;
    db.get(`SELECT * FROM homework WHERE id = ?`, [newId], (gErr, row) => {
      if (gErr || !row) {
        return res.status(201).json({
          success: true,
          message: 'Homework created successfully!',
          code
        });
      }

      const formatted = formatHomework(row, req);
      return res.status(201).json({
        success: true,
        message: 'Homework published successfully!',
        homework: formatted
      });
    });
  });
};

// PUT update homework (Teacher only)
export const updateHomework = (req, res) => {
  const { idOrCode } = req.params;
  const {
    title,
    class_name,
    subject,
    description,
    homework_date,
    deadline_date,
    video_url,
    remove_file
  } = req.body;

  db.get(`SELECT * FROM homework WHERE id = ? OR code = ?`, [idOrCode, idOrCode], (fetchErr, existing) => {
    if (fetchErr) {
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Homework not found.' });
    }

    let file_name = existing.file_name;
    let file_original_name = existing.file_original_name;
    let file_size = existing.file_size;
    let file_mimetype = existing.file_mimetype;

    // Check if new file uploaded
    if (req.file) {
      // Remove old file if it existed
      if (existing.file_name) {
        const oldPath = path.join(uploadDir, existing.file_name);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
        }
      }
      file_name = req.file.filename;
      file_original_name = req.file.originalname;
      file_size = req.file.size;
      file_mimetype = req.file.mimetype;
    } else if (remove_file === 'true') {
      // Explicitly asked to remove attached file
      if (existing.file_name) {
        const oldPath = path.join(uploadDir, existing.file_name);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
        }
      }
      file_name = null;
      file_original_name = null;
      file_size = null;
      file_mimetype = null;
    }

    const cleanVideoUrl = video_url && video_url.trim() !== '' ? video_url.trim() : null;

    const sql = `
      UPDATE homework SET
        title = ?,
        class_name = ?,
        subject = ?,
        description = ?,
        homework_date = ?,
        deadline_date = ?,
        file_name = ?,
        file_original_name = ?,
        file_size = ?,
        file_mimetype = ?,
        video_url = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      title ? title.trim() : existing.title,
      class_name ? class_name.trim() : existing.class_name,
      subject ? subject.trim() : existing.subject,
      description ? description.trim() : existing.description,
      homework_date || existing.homework_date,
      deadline_date || existing.deadline_date,
      file_name,
      file_original_name,
      file_size,
      file_mimetype,
      cleanVideoUrl,
      existing.id
    ];

    db.run(sql, params, function (updateErr) {
      if (updateErr) {
        console.error('Error updating homework:', updateErr);
        return res.status(500).json({ success: false, message: 'Failed to update homework.' });
      }

      db.get(`SELECT * FROM homework WHERE id = ?`, [existing.id], (gErr, updatedRow) => {
        const formatted = formatHomework(updatedRow, req);
        return res.json({
          success: true,
          message: 'Homework updated successfully!',
          homework: formatted
        });
      });
    });
  });
};

// DELETE homework (Teacher only)
export const deleteHomework = (req, res) => {
  const { idOrCode } = req.params;

  db.get(`SELECT * FROM homework WHERE id = ? OR code = ?`, [idOrCode, idOrCode], (fetchErr, row) => {
    if (fetchErr) {
      return res.status(500).json({ success: false, message: 'Database error.' });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: 'Homework not found.' });
    }

    // Delete attached file if exists
    if (row.file_name) {
      const filePath = path.join(uploadDir, row.file_name);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
      }
    }

    db.run(`DELETE FROM homework WHERE id = ?`, [row.id], function (delErr) {
      if (delErr) {
        console.error('Error deleting homework:', delErr);
        return res.status(500).json({ success: false, message: 'Failed to delete homework.' });
      }

      return res.json({
        success: true,
        message: 'Homework deleted successfully.'
      });
    });
  });
};
