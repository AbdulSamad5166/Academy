import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'academy.db');

let sqlDb = null;

// Helper to save DB state to file system
function persistDatabase() {
  if (sqlDb) {
    try {
      const data = sqlDb.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    } catch (e) {
      console.error('Error saving SQLite database to disk:', e);
    }
  }
}

// Emulate SQLite3 node driver API for maximum simplicity & clean syntax
const db = {
  all(sql, params = [], callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    try {
      const stmt = sqlDb.prepare(sql);
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      if (callback) callback(null, rows);
    } catch (err) {
      if (callback) callback(err);
      else console.error('SQL all error:', err);
    }
  },

  get(sql, params = [], callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    try {
      const stmt = sqlDb.prepare(sql);
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      let row = null;
      if (stmt.step()) {
        row = stmt.getAsObject();
      }
      stmt.free();
      if (callback) callback(null, row);
    } catch (err) {
      if (callback) callback(err);
      else console.error('SQL get error:', err);
    }
  },

  run(sql, params = [], callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    try {
      if (params && params.length > 0) {
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        stmt.step();
        stmt.free();
      } else {
        sqlDb.run(sql);
      }

      // Retrieve last inserted ID and modified rows count
      const res = sqlDb.exec("SELECT last_insert_rowid() as id, changes() as changes;");
      let lastID = 0;
      let changes = 0;
      if (res && res[0] && res[0].values && res[0].values[0]) {
        lastID = res[0].values[0][0];
        changes = res[0].values[0][1];
      }

      persistDatabase();

      if (callback) {
        callback.call({ lastID, changes }, null);
      }
    } catch (err) {
      if (callback) callback(err);
      else console.error('SQL run error:', err);
    }
  },

  exec(sql) {
    const res = sqlDb.exec(sql);
    persistDatabase();
    return res;
  }
};

// Initialize database and tables
export async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database file if exists
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      sqlDb = new SQL.Database(fileBuffer);
      console.log('Loaded existing SQLite database from:', dbPath);
    } catch (e) {
      console.warn('Could not read existing DB file, creating a fresh one:', e.message);
      sqlDb = new SQL.Database();
    }
  } else {
    sqlDb = new SQL.Database();
    console.log('Created fresh SQLite database at:', dbPath);
  }

  // 1. Create Teachers Table
  db.run(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      academy_name TEXT DEFAULT 'Apex Tuition Academy',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Create Homework Table
  db.run(`
    CREATE TABLE IF NOT EXISTS homework (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      class_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      homework_date TEXT NOT NULL,
      deadline_date TEXT NOT NULL,
      file_name TEXT,
      file_original_name TEXT,
      file_size INTEGER,
      file_mimetype TEXT,
      video_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Seed default teachers if table is empty
  await new Promise((resolve) => {
    db.get(`SELECT COUNT(*) as count FROM teachers`, async (err, row) => {
      if (!err && row && row.count === 0) {
        const salt = await bcrypt.genSalt(10);
        const teacherPass = await bcrypt.hash('teacher123', salt);
        const adminPass = await bcrypt.hash('admin123', salt);

        db.run(
          `INSERT INTO teachers (username, password, name, academy_name) VALUES (?, ?, ?, ?)`,
          ['teacher', teacherPass, 'Prof. Sharma', 'Apex Tuition Academy']
        );
        db.run(
          `INSERT INTO teachers (username, password, name, academy_name) VALUES (?, ?, ?, ?)`,
          ['admin', adminPass, 'Academy Administrator', 'Apex Tuition Academy']
        );

        console.log('Default teacher accounts seeded:');
        console.log('  - teacher / teacher123');
        console.log('  - admin / admin123');
      }
      resolve();
    });
  });

  // 4. Seed initial homework if empty
  await new Promise((resolve) => {
    db.get(`SELECT COUNT(*) as count FROM homework`, (err, row) => {
      if (!err && row && row.count === 0) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];

        db.run(
          `INSERT INTO homework (code, title, class_name, subject, description, homework_date, deadline_date, video_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'math-101',
            'Algebraic Expressions & Factorization Practice',
            'Class 9',
            'Mathematics',
            'Complete Exercises 4.1 to 4.3 from your textbook. Focus on questions 5, 8, and 12. Show all step-by-step working in your neat homework notebook.',
            today,
            tomorrow,
            'https://www.youtube.com/watch?v=NybHckSEQBI'
          ]
        );

        db.run(
          `INSERT INTO homework (code, title, class_name, subject, description, homework_date, deadline_date, video_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'sci-202',
            'Laws of Motion & Numerical Problems',
            'Class 10',
            'Physics',
            'Read Chapter 3 carefully. Solve numerical questions 1 through 7 on page 58. Memorize Newton\'s Second Law formula derivation.',
            today,
            nextWeek,
            null
          ]
        );

        db.run(
          `INSERT INTO homework (code, title, class_name, subject, description, homework_date, deadline_date, video_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'eng-303',
            'Formal Letter Writing & Grammar Worksheet',
            'Class 8',
            'English',
            'Write a formal letter to the editor regarding clean drinking water in your locality. Follow the format taught in class. Limit 150-180 words.',
            today,
            tomorrow,
            null
          ]
        );

        console.log('Initial sample homework seeded.');
      }
      resolve();
    });
  });

  persistDatabase();
  return db;
}

export default db;
