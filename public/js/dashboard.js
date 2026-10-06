/**
 * TEACHER DASHBOARD SCRIPT
 */

let allHomeworkData = [];
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Check teacher authentication first
  const teacher = await checkTeacherAuth();
  if (!teacher) return;

  // Initialize UI elements
  initTeacherHeader(teacher);
  setupEventListeners();

  // Load initial data
  await Promise.all([
    loadStats(),
    loadFilterOptions(),
    loadHomeworkList()
  ]);
});

// Guard: verify token with backend
async function checkTeacherAuth() {
  try {
    const teacher = await API.checkAuth();
    if (!teacher) {
      API.removeToken();
      window.location.href = '/login.html?expired=true';
      return null;
    }
    return teacher;
  } catch (e) {
    API.removeToken();
    window.location.href = '/login.html?expired=true';
    return null;
  }
}

function initTeacherHeader(teacher) {
  const teacherNameEl = document.getElementById('teacherName');
  const academyNameEl = document.getElementById('academyName');
  if (teacherNameEl) teacherNameEl.textContent = teacher.name;
  if (academyNameEl) academyNameEl.textContent = teacher.academy_name || 'Apex Tuition Academy';
}

function setupEventListeners() {
  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      API.logout();
    });
  }

  // Search input
  const searchInput = document.getElementById('dashboardSearch');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        applyFilters();
      }, 300);
    });
  }

  // Filter dropdowns
  const classFilter = document.getElementById('classFilter');
  const subjectFilter = document.getElementById('subjectFilter');
  const statusFilter = document.getElementById('statusFilter');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  if (classFilter) classFilter.addEventListener('change', applyFilters);
  if (subjectFilter) subjectFilter.addEventListener('change', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (classFilter) classFilter.value = 'all';
      if (subjectFilter) subjectFilter.value = 'all';
      if (statusFilter) statusFilter.value = 'all';
      applyFilters();
    });
  }

  // Delete Modal confirmation
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const deleteModalClose = document.getElementById('deleteModalClose');

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', executeDelete);
  }
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  }
  if (deleteModalClose) {
    deleteModalClose.addEventListener('click', closeDeleteModal);
  }

  // Share Modal
  const shareModalClose = document.getElementById('shareModalClose');
  const copyModalLinkBtn = document.getElementById('copyModalLinkBtn');
  if (shareModalClose) {
    shareModalClose.addEventListener('click', closeShareModal);
  }
  if (copyModalLinkBtn) {
    copyModalLinkBtn.addEventListener('click', () => {
      const input = document.getElementById('modalShareUrl');
      if (input) {
        copyToClipboard(input.value, 'Link copied! You can now send it on WhatsApp.');
      }
    });
  }
}

// Fetch dashboard statistics
async function loadStats() {
  try {
    const res = await API.getStats();
    if (res.success && res.stats) {
      document.getElementById('statTotal').textContent = res.stats.total || 0;
      document.getElementById('statToday').textContent = res.stats.uploadedToday || 0;
      document.getElementById('statActive').textContent = res.stats.active || 0;
      document.getElementById('statDue').textContent = res.stats.dueSoon || 0;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// Fetch classes and subjects for filter dropdowns
async function loadFilterOptions() {
  try {
    const res = await API.getFilters();
    if (res.success) {
      const classFilter = document.getElementById('classFilter');
      const subjectFilter = document.getElementById('subjectFilter');

      if (classFilter) {
        classFilter.innerHTML = '<option value="all">All Classes</option>';
        res.classes.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c;
          opt.textContent = c;
          classFilter.appendChild(opt);
        });
      }

      if (subjectFilter) {
        subjectFilter.innerHTML = '<option value="all">All Subjects</option>';
        res.subjects.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s;
          subjectFilter.appendChild(opt);
        });
      }
    }
  } catch (err) {
    console.error('Failed to load filter options:', err);
  }
}

// Load homework list from server
async function loadHomeworkList() {
  const tableBody = document.getElementById('homeworkTableBody');
  const mobileList = document.getElementById('mobileHwList');
  const emptyState = document.getElementById('dashboardEmptyState');

  try {
    const res = await API.getHomework();
    if (res.success) {
      allHomeworkData = res.homework || [];
      renderHomework(allHomeworkData);
    }
  } catch (err) {
    console.error('Failed to load homework:', err);
    showToast('Failed to load homework list.', 'error');
  }
}

// Apply local/server filtering
function applyFilters() {
  const searchTerm = (document.getElementById('dashboardSearch')?.value || '').toLowerCase().trim();
  const selectedClass = document.getElementById('classFilter')?.value || 'all';
  const selectedSubject = document.getElementById('subjectFilter')?.value || 'all';
  const selectedStatus = document.getElementById('statusFilter')?.value || 'all';

  const filtered = allHomeworkData.filter(hw => {
    // Search text match
    const matchesSearch = !searchTerm ||
      hw.title.toLowerCase().includes(searchTerm) ||
      hw.description.toLowerCase().includes(searchTerm) ||
      hw.class_name.toLowerCase().includes(searchTerm) ||
      hw.subject.toLowerCase().includes(searchTerm);

    // Class match
    const matchesClass = selectedClass === 'all' || hw.class_name === selectedClass;

    // Subject match
    const matchesSubject = selectedSubject === 'all' || hw.subject === selectedSubject;

    // Status match
    const matchesStatus = selectedStatus === 'all' || hw.status === selectedStatus;

    return matchesSearch && matchesClass && matchesSubject && matchesStatus;
  });

  renderHomework(filtered);
}

// Render homework in both Desktop Table & Mobile Cards
function renderHomework(items) {
  const tableBody = document.getElementById('homeworkTableBody');
  const mobileList = document.getElementById('mobileHwList');
  const emptyState = document.getElementById('dashboardEmptyState');
  const countEl = document.getElementById('displayedHwCount');

  if (countEl) {
    countEl.textContent = `Showing ${items.length} homework assignment${items.length === 1 ? '' : 's'}`;
  }

  if (items.length === 0) {
    if (tableBody) tableBody.innerHTML = '';
    if (mobileList) mobileList.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // Desktop Table Rows
  if (tableBody) {
    tableBody.innerHTML = items.map(hw => `
      <tr>
        <td class="hw-title-cell">
          <a href="/homework/${escapeHtml(hw.code)}" target="_blank" class="hw-main-title text-decoration-none">
            ${escapeHtml(hw.title)}
          </a>
          <div class="hw-meta-badges">
            <span class="badge badge-class">${escapeHtml(hw.class_name)}</span>
            <span class="badge badge-subject">${escapeHtml(hw.subject)}</span>
            ${hw.file_name ? '<span title="File attached" style="font-size: 0.8rem;">📎</span>' : ''}
            ${hw.video_url ? '<span title="Video attached" style="font-size: 0.8rem;">🎥</span>' : ''}
          </div>
        </td>
        <td>
          <span style="font-weight: 600;">${escapeHtml(hw.class_name)}</span>
        </td>
        <td>
          <span>${escapeHtml(hw.subject)}</span>
        </td>
        <td>
          <span style="color: var(--text-muted); font-size: 0.875rem;">${formatDate(hw.homework_date)}</span>
        </td>
        <td>
          <span style="font-weight: 600; font-size: 0.875rem;">${formatDate(hw.deadline_date)}</span>
        </td>
        <td>
          <span class="badge ${hw.badgeClass}">${hw.statusLabel}</span>
        </td>
        <td>
          <div class="action-buttons">
            <a href="/homework/${escapeHtml(hw.code)}" target="_blank" class="icon-btn" title="View Public Page">
              👁️
            </a>
            <button class="icon-btn" onclick="copyHomeworkLink('${escapeHtml(hw.shareableUrl)}')" title="Copy Shareable Link">
              🔗
            </button>
            <a href="${escapeHtml(hw.whatsappShareUrl)}" target="_blank" rel="noopener noreferrer" class="icon-btn btn-whatsapp-sm" title="Share on WhatsApp">
              💬
            </a>
            <a href="/edit-homework.html?id=${escapeHtml(hw.code)}" class="icon-btn" title="Edit Homework">
              ✏️
            </a>
            <button class="icon-btn btn-delete-sm" onclick="promptDelete('${escapeHtml(hw.code)}', '${escapeHtml(hw.title)}')" title="Delete Homework">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Mobile Cards
  if (mobileList) {
    mobileList.innerHTML = items.map(hw => `
      <div class="mobile-hw-card">
        <div class="mobile-hw-header">
          <div>
            <h3>${escapeHtml(hw.title)}</h3>
            <div class="mobile-hw-meta" style="margin-top: 4px;">
              <span class="badge badge-class">${escapeHtml(hw.class_name)}</span>
              <span class="badge badge-subject">${escapeHtml(hw.subject)}</span>
            </div>
          </div>
          <span class="badge ${hw.badgeClass}">${hw.statusLabel}</span>
        </div>

        <div class="mobile-hw-dates">
          <div>📅 <strong>Assigned:</strong> ${formatDate(hw.homework_date)}</div>
          <div>⏰ <strong>Deadline:</strong> ${formatDate(hw.deadline_date)}</div>
          ${hw.file_original_name ? `<div>📎 <strong>Attachment:</strong> ${escapeHtml(hw.file_original_name)}</div>` : ''}
        </div>

        <div class="mobile-hw-actions">
          <a href="/homework/${escapeHtml(hw.code)}" target="_blank" class="btn btn-secondary btn-sm" style="flex: 1;">
            👁️ View
          </a>
          <button onclick="copyHomeworkLink('${escapeHtml(hw.shareableUrl)}')" class="btn btn-secondary btn-sm" style="flex: 1;">
            🔗 Copy Link
          </button>
          <a href="${escapeHtml(hw.whatsappShareUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-sm" style="flex: 1.2;">
            💬 WhatsApp
          </a>
          <a href="/edit-homework.html?id=${escapeHtml(hw.code)}" class="btn btn-secondary btn-sm">
            ✏️
          </a>
          <button onclick="promptDelete('${escapeHtml(hw.code)}', '${escapeHtml(hw.title)}')" class="btn btn-danger btn-sm">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  }
}

// Copy link global function
window.copyHomeworkLink = function(url) {
  copyToClipboard(url, 'Homework link copied! Send it on WhatsApp.');
};

// Open share popup modal
window.openShareModal = function(code, title, url, whatsappUrl) {
  const modal = document.getElementById('shareModal');
  const input = document.getElementById('modalShareUrl');
  const waBtn = document.getElementById('modalWaBtn');
  const titleEl = document.getElementById('modalShareTitle');

  if (titleEl) titleEl.textContent = title;
  if (input) input.value = url;
  if (waBtn) waBtn.href = whatsappUrl;

  if (modal) modal.classList.add('active');
};

function closeShareModal() {
  const modal = document.getElementById('shareModal');
  if (modal) modal.classList.remove('active');
}

// Delete confirmation modal
window.promptDelete = function(code, title) {
  deleteTargetId = code;
  const modal = document.getElementById('deleteModal');
  const titleEl = document.getElementById('deleteTargetTitle');
  if (titleEl) titleEl.textContent = `"${title}"`;
  if (modal) modal.classList.add('active');
};

function closeDeleteModal() {
  deleteTargetId = null;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.classList.remove('active');
}

async function executeDelete() {
  if (!deleteTargetId) return;

  const confirmBtn = document.getElementById('confirmDeleteBtn');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Deleting...';

  try {
    const res = await API.deleteHomework(deleteTargetId);
    if (res.success) {
      showToast('Homework deleted successfully.', 'success');
      closeDeleteModal();
      // Reload stats and homework list
      await Promise.all([
        loadStats(),
        loadHomeworkList()
      ]);
    } else {
      showToast(res.message || 'Failed to delete homework.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Error deleting homework.', 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Yes, Delete';
  }
}
