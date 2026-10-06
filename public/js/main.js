/**
 * STUDENT HOME PAGE SCRIPT (index.html)
 * Public portal - No login required
 */

let publicHomework = [];

document.addEventListener('DOMContentLoaded', async () => {
  setupStudentSearch();
  await Promise.all([
    loadFilters(),
    loadPublicHomework()
  ]);
});

async function loadFilters() {
  try {
    const res = await API.getFilters();
    if (res.success) {
      const classSelect = document.getElementById('studentClassSelect');
      const subjectSelect = document.getElementById('studentSubjectSelect');

      if (classSelect) {
        classSelect.innerHTML = '<option value="all">All Classes</option>';
        res.classes.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c;
          opt.textContent = c;
          classSelect.appendChild(opt);
        });
      }

      if (subjectSelect) {
        subjectSelect.innerHTML = '<option value="all">All Subjects</option>';
        res.subjects.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s;
          subjectSelect.appendChild(opt);
        });
      }
    }
  } catch (err) {
    console.error('Failed to load filters:', err);
  }
}

async function loadPublicHomework() {
  const container = document.getElementById('publicHwGrid');
  const emptyState = document.getElementById('publicEmptyState');
  const loader = document.getElementById('publicLoader');

  if (loader) loader.style.display = 'block';

  try {
    const res = await API.getHomework();
    if (res.success) {
      publicHomework = res.homework || [];
      renderStudentCards(publicHomework);
    }
  } catch (err) {
    console.error('Error fetching homework:', err);
    showToast('Failed to load homework assignments.', 'error');
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

function setupStudentSearch() {
  const searchInput = document.getElementById('studentSearchInput');
  const classSelect = document.getElementById('studentClassSelect');
  const subjectSelect = document.getElementById('studentSubjectSelect');
  const statusSelect = document.getElementById('studentStatusSelect');
  const resetBtn = document.getElementById('studentResetFilters');

  let debounce;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(filterHomework, 250);
    });
  }

  if (classSelect) classSelect.addEventListener('change', filterHomework);
  if (subjectSelect) subjectSelect.addEventListener('change', filterHomework);
  if (statusSelect) statusSelect.addEventListener('change', filterHomework);

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (classSelect) classSelect.value = 'all';
      if (subjectSelect) subjectSelect.value = 'all';
      if (statusSelect) statusSelect.value = 'all';
      filterHomework();
    });
  }
}

function filterHomework() {
  const search = (document.getElementById('studentSearchInput')?.value || '').toLowerCase().trim();
  const selectedClass = document.getElementById('studentClassSelect')?.value || 'all';
  const selectedSubject = document.getElementById('studentSubjectSelect')?.value || 'all';
  const selectedStatus = document.getElementById('studentStatusSelect')?.value || 'all';

  const filtered = publicHomework.filter(hw => {
    const matchesSearch = !search ||
      hw.title.toLowerCase().includes(search) ||
      hw.description.toLowerCase().includes(search) ||
      hw.class_name.toLowerCase().includes(search) ||
      hw.subject.toLowerCase().includes(search);

    const matchesClass = selectedClass === 'all' || hw.class_name === selectedClass;
    const matchesSubject = selectedSubject === 'all' || hw.subject === selectedSubject;
    const matchesStatus = selectedStatus === 'all' || hw.status === selectedStatus;

    return matchesSearch && matchesClass && matchesSubject && matchesStatus;
  });

  renderStudentCards(filtered);
}

function renderStudentCards(items) {
  const container = document.getElementById('publicHwGrid');
  const emptyState = document.getElementById('publicEmptyState');
  const countLabel = document.getElementById('resultsCount');

  if (countLabel) {
    countLabel.textContent = `${items.length} assignment${items.length === 1 ? '' : 's'} available`;
  }

  if (!items || items.length === 0) {
    if (container) container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  if (container) {
    container.innerHTML = items.map(hw => `
      <div class="hw-card">
        <div class="hw-card-top">
          <div class="hw-card-badges">
            <span class="badge badge-class">${escapeHtml(hw.class_name)}</span>
            <span class="badge badge-subject">${escapeHtml(hw.subject)}</span>
          </div>
          <span class="badge ${hw.badgeClass}">${hw.statusLabel}</span>
        </div>

        <h3 class="hw-card-title">${escapeHtml(hw.title)}</h3>
        <p class="hw-card-desc">${escapeHtml(hw.description)}</p>

        <div class="hw-card-footer">
          <div class="hw-card-dates">
            <div>Assigned: <strong>${formatDate(hw.homework_date)}</strong></div>
            <div>Deadline: <strong style="${hw.status === 'due-soon' ? 'color: var(--warning-text);' : hw.status === 'passed' ? 'color: var(--danger-text);' : ''}">${formatDate(hw.deadline_date)}</strong></div>
          </div>
          <a href="/homework/${escapeHtml(hw.code)}" class="btn btn-primary btn-sm">
            View Homework →
          </a>
        </div>
      </div>
    `).join('');
  }
}
