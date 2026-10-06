# Academy Homework Hub 📚

A professional, lightweight, and mobile-friendly **Homework Sharing Web App** designed specifically for tuition academies, tutoring centers, and teachers.

The app allows teachers to publish daily homework, attach worksheets/images/documents, specify deadlines, and instantly generate unique shareable links that can be sent to students and parent groups via **WhatsApp with one click**. Students can open links on their phones without creating an account or logging in.

---

## 🚀 Key Features

1. **Teacher Dashboard & Admin Portal**
   - Secure login using password hashing (bcrypt) and session tokens.
   - Real-time statistics: Total Homework, Uploaded Today, Active Assignments, Due Soon.
   - Comprehensive homework management: Search, filter by class/subject/status, edit, and delete with confirmation.
   - Default teacher accounts: `teacher` / `teacher123` and `admin` / `admin123`.

2. **Quick WhatsApp Sharing**
   - Automatically pre-formats WhatsApp messages with:
     ```
     *New Homework*

     *Class:* Class 9
     *Subject:* Mathematics
     *Homework:* Algebraic Fractions Practice
     *Deadline:* 2026-10-08

     *View Homework:*
     https://your-domain.com/homework/hw-8k2p9x
     ```
   - One-click copy link with instant clipboard toast feedback.

3. **Student Public Portal (Zero Friction)**
   - **No student account or login required.**
   - Clean, mobile-optimized interface for quick reading on smartphones.
   - Shows assignment title, class, subject, assigned date, submission deadline, and step-by-step instructions.
   - Real-time status badges: **Active** (green), **Due Soon** (amber), **Deadline Passed** (red).
   - Document attachment preview and direct download button (PDF, JPG, PNG, DOC, DOCX).
   - Inline video tutorial embed (YouTube).

4. **Robust & Beginner-Friendly Backend**
   - Built with **Node.js + Express**.
   - Persistent storage using lightweight **SQLite** database (`database/academy.db`).
   - File uploads managed securely through **Multer** in `uploads/`.
   - Pure **HTML, CSS, and Vanilla JavaScript** frontend — **No React, No Vite, No build step needed**.

---

## 🛠️ Technologies Used

- **Frontend:** HTML5, CSS3 (Custom responsive styling), Vanilla JavaScript (ES6+)
- **Backend:** Node.js, Express.js
- **Database:** SQLite3
- **File Uploads:** Multer (PDF, JPG, JPEG, PNG, DOC, DOCX)
- **Security:** bcryptjs (password hashing), jsonwebtoken (JWT), cookie-parser

---

## 📁 Project Folder Structure

```text
├── database/
│   └── db.js                  # SQLite database setup, schema & auto-seeding
├── middleware/
│   ├── authMiddleware.js      # JWT authentication middleware for teachers
│   └── uploadMiddleware.js    # Multer configuration & file type validation
├── controllers/
│   ├── authController.js      # Login, logout, session check logic
│   └── homeworkController.js  # Homework CRUD, status calculation & stats
├── routes/
│   ├── auth.js                # /api/auth routes
│   └── homework.js            # /api/homework routes
├── public/                    # Static frontend files
│   ├── index.html             # Student public homework directory
│   ├── login.html             # Teacher login page
│   ├── dashboard.html         # Teacher management dashboard
│   ├── add-homework.html      # Create new homework page
│   ├── edit-homework.html     # Edit homework page
│   ├── homework.html          # Mobile-friendly student homework view
│   ├── css/
│   │   ├── style.css          # Base styles, variables, typography & modals
│   │   ├── dashboard.css      # Teacher dashboard & stats styling
│   │   └── homework.css       # Student portal & single homework styling
│   └── js/
│       ├── api.js             # API client, toast notifications & helpers
│       ├── login.js           # Teacher login authentication handler
│       ├── dashboard.js       # Dashboard table, stats & action triggers
│       ├── form.js            # Add/Edit form submission & file handling
│       ├── homework.js        # Student homework detail renderer
│       └── main.js            # Student home directory search & filter
├── uploads/                   # Stored teacher attachments (PDFs, images, docs)
├── server.js                  # Main Express server entry point
├── package.json               # Project dependencies and run scripts
└── README.md                  # Complete documentation
```

---

## ⚙️ Installation & Running the Application

### 1. Prerequisites
Ensure you have **Node.js** (v18 or higher) installed on your system.

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
npm run dev
# or
npm start
```
The server will initialize the SQLite database (`database/academy.db`), seed the default teacher accounts and initial homework, and start listening on port `3000`.

Open your browser at:
- **Student Portal:** `http://localhost:3000/`
- **Teacher Login:** `http://localhost:3000/login.html`

---

## 👨‍🏫 Teacher & Admin Login Credentials

The database automatically seeds the following credentials on first launch:

| Role | Username | Password | Notes |
|---|---|---|---|
| Primary Teacher | `teacher` | `teacher123` | Main teacher profile |
| Academy Admin | `admin` | `admin123` | Backup administrator |

*(You can also click the "Fill: teacher" or "Fill: admin" buttons on the login screen to auto-fill for testing).*

---

## 📖 How to Use the App

### Step 1: Teacher Logs In & Adds Homework
1. Go to `http://localhost:3000/login.html`.
2. Enter username `teacher` and password `teacher123`.
3. Click **Sign In to Dashboard**.
4. In the dashboard, click **➕ New Homework Assignment**.
5. Enter:
   - **Homework Title** (e.g. *Chapter 4: Quadratic Equations Practice*)
   - **Class** (e.g. *Class 10*)
   - **Subject** (e.g. *Mathematics*)
   - **Assigned Date** and **Submission Deadline**
   - **Instructions / Questions**
   - *(Optional)* Attach a PDF worksheet or photo of questions (JPG, PNG, DOC, DOCX up to 30MB)
   - *(Optional)* Paste a YouTube tutorial or solution link
6. Click **Publish & Generate Link 🚀**.

### Step 2: Share Link on WhatsApp
1. A success modal immediately pops up with the generated unique URL (e.g., `http://localhost:3000/homework/hw-8k2p9x`).
2. Click **💬 Share on WhatsApp** to open WhatsApp directly with the formatted homework text.
3. Or click **📋 Copy** to copy the link and paste it into student WhatsApp groups.

### Step 3: Students Access Homework
1. A student taps the WhatsApp link on their smartphone.
2. The page opens immediately — **no password or account needed**.
3. Students see the academy header, subject, deadline status, instructions, and can click **⬇️ Download File** to open the PDF or worksheet.
4. Students can also browse all available homework assignments by visiting the homepage.

---

## 🔒 Security & Data Integrity

- Passwords are encrypted using salted **bcrypt** hashes; plain passwords are never stored or logged.
- Only authenticated teachers can add, update, or delete homework assignments.
- File uploads are validated strictly for authorized MIME types and file extensions (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.doc`, `.docx`).
- Cross-Site Scripting (XSS) prevention with output encoding helpers on the frontend.
- When an assignment is deleted, its attached physical file is cleaned up from the `uploads/` directory.
