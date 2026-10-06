/**
 * ADD & EDIT HOMEWORK FORM LOGIC
 */

let isEditMode = false;
let currentHomeworkCode = null;
let selectedFile = null;
let removeExistingFileFlag = false;

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  const teacher = await checkTeacherAuth();
  if (!teacher) return;

  // Determine if Edit or Add mode
  const urlParams = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/');
  const editCodeFromPath = pathParts[1] === 'edit-homework' && pathParts[2] ? pathParts[2] : null;
  currentHomeworkCode = urlParams.get('id') || editCodeFromPath;

  if (currentHomeworkCode) {
    isEditMode = true;
    const pageHeading = document.getElementById('formPageHeading');
    if (pageHeading) pageHeading.textContent = 'Edit Homework';
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.innerHTML = '<span>Save Changes</span>';
    await loadExistingHomework(currentHomeworkCode);
  } else {
    initDefaultDates();
  }

  setupFormHandlers();
});

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

function initDefaultDates() {
  const hwDateInput = document.getElementById('homework_date');
  const deadlineInput = document.getElementById('deadline_date');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (hwDateInput && !hwDateInput.value) hwDateInput.value = todayStr;
  if (deadlineInput && !deadlineInput.value) deadlineInput.value = tomorrowStr;
}

function setupFormHandlers() {
  const fileInput = document.getElementById('fileInput');
  const dropzone = document.getElementById('fileDropzone');
  const fileSelectedBox = document.getElementById('fileSelectedBox');
  const selectedFileName = document.getElementById('selectedFileName');
  const selectedFileSize = document.getElementById('selectedFileSize');
  const removeFileBtn = document.getElementById('removeFileBtn');
  const homeworkForm = document.getElementById('homeworkForm');

  // Drag and drop handlers
  if (dropzone && fileInput) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });
  }

  function handleFileSelect(file) {
    // Validate extension
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowed.includes(ext)) {
      showToast(`Invalid file type (${ext}). Allowed: PDF, JPG, PNG, DOC, DOCX.`, 'error');
      return;
    }

    // Validate size (30MB max)
    if (file.size > 30 * 1024 * 1024) {
      showToast('File size exceeds 30MB limit.', 'error');
      return;
    }

    selectedFile = file;
    removeExistingFileFlag = false;

    if (selectedFileName) selectedFileName.textContent = file.name;
    if (selectedFileSize) selectedFileSize.textContent = formatBytes(file.size);
    if (fileSelectedBox) fileSelectedBox.style.display = 'flex';
    if (dropzone) dropzone.style.display = 'none';

    // Hide existing attachment box if edit mode
    const existingFileBox = document.getElementById('existingFileBox');
    if (existingFileBox) existingFileBox.style.display = 'none';
  }

  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
      selectedFile = null;
      if (fileInput) fileInput.value = '';
      if (fileSelectedBox) fileSelectedBox.style.display = 'none';
      if (dropzone) dropzone.style.display = 'block';
    });
  }

  // Remove existing attachment in edit mode
  const removeExistingBtn = document.getElementById('removeExistingAttachmentBtn');
  if (removeExistingBtn) {
    removeExistingBtn.addEventListener('click', () => {
      removeExistingFileFlag = true;
      const existingFileBox = document.getElementById('existingFileBox');
      if (existingFileBox) existingFileBox.style.display = 'none';
      if (dropzone) dropzone.style.display = 'block';
      showToast('Attachment marked for removal.', 'info');
    });
  }

  // Custom class input toggle
  const classSelect = document.getElementById('classSelect');
  const customClassInput = document.getElementById('customClassInput');
  if (classSelect && customClassInput) {
    classSelect.addEventListener('change', () => {
      if (classSelect.value === '__custom__') {
        customClassInput.style.display = 'block';
        customClassInput.focus();
      } else {
        customClassInput.style.display = 'none';
      }
    });
  }

  // Custom subject input toggle
  const subjectSelect = document.getElementById('subjectSelect');
  const customSubjectInput = document.getElementById('customSubjectInput');
  if (subjectSelect && customSubjectInput) {
    subjectSelect.addEventListener('change', () => {
      if (subjectSelect.value === '__custom__') {
        customSubjectInput.style.display = 'block';
        customSubjectInput.focus();
      } else {
        customSubjectInput.style.display = 'none';
      }
    });
  }

  // Form submit
  if (homeworkForm) {
    homeworkForm.addEventListener('submit', handleFormSubmit);
  }
}

async function loadExistingHomework(code) {
  try {
    const res = await API.getHomeworkById(code);
    if (!res.success || !res.homework) {
      showToast('Homework not found.', 'error');
      setTimeout(() => window.location.href = '/dashboard.html', 1500);
      return;
    }

    const hw = res.homework;
    document.getElementById('title').value = hw.title;
    document.getElementById('description').value = hw.description;
    document.getElementById('homework_date').value = hw.homework_date;
    document.getElementById('deadline_date').value = hw.deadline_date;
    if (hw.video_url) document.getElementById('video_url').value = hw.video_url;

    // Set class
    const classSelect = document.getElementById('classSelect');
    const customClassInput = document.getElementById('customClassInput');
    let classMatched = false;
    for (let opt of classSelect.options) {
      if (opt.value === hw.class_name) {
        classSelect.value = hw.class_name;
        classMatched = true;
        break;
      }
    }
    if (!classMatched) {
      classSelect.value = '__custom__';
      customClassInput.style.display = 'block';
      customClassInput.value = hw.class_name;
    }

    // Set subject
    const subjectSelect = document.getElementById('subjectSelect');
    const customSubjectInput = document.getElementById('customSubjectInput');
    let subjectMatched = false;
    for (let opt of subjectSelect.options) {
      if (opt.value === hw.subject) {
        subjectSelect.value = hw.subject;
        subjectMatched = true;
        break;
      }
    }
    if (!subjectMatched) {
      subjectSelect.value = '__custom__';
      customSubjectInput.style.display = 'block';
      customSubjectInput.value = hw.subject;
    }

    // Show existing attachment if present
    if (hw.file_name) {
      const existingFileBox = document.getElementById('existingFileBox');
      const existingFileName = document.getElementById('existingFileName');
      const existingFileSize = document.getElementById('existingFileSize');
      const dropzone = document.getElementById('fileDropzone');

      if (existingFileBox && existingFileName) {
        existingFileName.textContent = hw.file_original_name || hw.file_name;
        if (existingFileSize && hw.file_size) existingFileSize.textContent = formatBytes(hw.file_size);
        existingFileBox.style.display = 'flex';
        if (dropzone) dropzone.style.display = 'none';
      }
    }
  } catch (err) {
    showToast('Failed to load homework details: ' + err.message, 'error');
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const homework_date = document.getElementById('homework_date').value;
  const deadline_date = document.getElementById('deadline_date').value;
  const video_url = document.getElementById('video_url')?.value.trim();

  // Determine class
  const classSelect = document.getElementById('classSelect');
  const customClassInput = document.getElementById('customClassInput');
  let className = classSelect.value;
  if (className === '__custom__') {
    className = customClassInput.value.trim();
  }

  // Determine subject
  const subjectSelect = document.getElementById('subjectSelect');
  const customSubjectInput = document.getElementById('customSubjectInput');
  let subject = subjectSelect.value;
  if (subject === '__custom__') {
    subject = customSubjectInput.value.trim();
  }

  // Validation
  if (!title) {
    showToast('Please enter a homework title.', 'error');
    return;
  }
  if (!className) {
    showToast('Please select or specify a class.', 'error');
    return;
  }
  if (!subject) {
    showToast('Please select or specify a subject.', 'error');
    return;
  }
  if (!description) {
    showToast('Please enter homework description or instructions.', 'error');
    return;
  }
  if (!homework_date || !deadline_date) {
    showToast('Please specify both assigned date and deadline date.', 'error');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Saving homework...</span>';

  const formData = new FormData();
  formData.append('title', title);
  formData.append('class_name', className);
  formData.append('subject', subject);
  formData.append('description', description);
  formData.append('homework_date', homework_date);
  formData.append('deadline_date', deadline_date);
  if (video_url) formData.append('video_url', video_url);

  if (selectedFile) {
    formData.append('attachment', selectedFile);
  }

  if (isEditMode && removeExistingFileFlag) {
    formData.append('remove_file', 'true');
  }

  try {
    let result;
    if (isEditMode) {
      result = await API.updateHomework(currentHomeworkCode, formData);
      showToast('Homework updated successfully!', 'success');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1000);
    } else {
      result = await API.createHomework(formData);
      if (result.success && result.homework) {
        showSuccessModal(result.homework);
      } else {
        showToast('Homework created!', 'success');
        setTimeout(() => window.location.href = '/dashboard.html', 1000);
      }
    }
  } catch (err) {
    showToast(err.message || 'Failed to save homework.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = isEditMode ? '<span>Save Changes</span>' : '<span>Publish & Get Share Link</span> 🚀';
  }
}

// Show the interactive success modal after creating homework
function showSuccessModal(hw) {
  const modal = document.getElementById('publishSuccessModal');
  const linkInput = document.getElementById('publishedShareLink');
  const waBtn = document.getElementById('publishedWaBtn');
  const viewLink = document.getElementById('publishedViewLink');

  if (linkInput) linkInput.value = hw.shareableUrl;
  if (waBtn) waBtn.href = hw.whatsappShareUrl;
  if (viewLink) viewLink.href = hw.shareableUrl;

  const copyBtn = document.getElementById('publishedCopyBtn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      copyToClipboard(hw.shareableUrl, 'Unique Homework Link copied! Ready to paste into WhatsApp.');
    };
  }

  if (modal) modal.classList.add('active');
}
