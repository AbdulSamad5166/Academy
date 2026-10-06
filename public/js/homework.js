/**
 * STUDENT HOMEWORK VIEW SCRIPT (homework.html)
 * Loads single homework by code or id from URL
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Extract homework code/id from URL pathname or query parameter
  const pathParts = window.location.pathname.split('/');
  // Path can be /homework/hw-abc123
  let idOrCode = null;
  if (pathParts[1] === 'homework' && pathParts[2]) {
    idOrCode = pathParts[2];
  } else {
    const params = new URLSearchParams(window.location.search);
    idOrCode = params.get('id');
  }

  if (!idOrCode) {
    showErrorState('No homework code specified. Please check your link.');
    return;
  }

  await loadHomework(idOrCode);
});

async function loadHomework(idOrCode) {
  const loader = document.getElementById('hwLoader');
  const content = document.getElementById('hwContent');

  if (loader) loader.style.display = 'block';
  if (content) content.style.display = 'none';

  try {
    const res = await API.getHomeworkById(idOrCode);
    if (!res.success || !res.homework) {
      showErrorState(res.message || 'Homework not found. This homework may have been removed.');
      return;
    }

    const hw = res.homework;
    renderHomeworkPage(hw);

    if (loader) loader.style.display = 'none';
    if (content) content.style.display = 'block';
  } catch (err) {
    showErrorState(err.message || 'Could not load homework assignment.');
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

function renderHomeworkPage(hw) {
  // Page title
  document.title = `${hw.title} - ${hw.class_name} ${hw.subject} | Apex Tuition`;

  // Basic Info
  setText('hwTitle', hw.title);
  setText('hwClass', hw.class_name);
  setText('hwSubject', hw.subject);
  setText('hwDate', formatDate(hw.homework_date));
  setText('hwDeadline', formatDate(hw.deadline_date));
  setText('hwInstructions', hw.description);

  // Status banner
  const banner = document.getElementById('hwStatusBanner');
  const bannerText = document.getElementById('hwStatusText');
  if (banner && bannerText) {
    banner.className = `status-banner banner-${hw.status}`;
    if (hw.status === 'passed') {
      bannerText.innerHTML = `⚠️ <strong>Deadline has passed</strong> (${formatDate(hw.deadline_date)})`;
    } else if (hw.status === 'due-soon') {
      bannerText.innerHTML = `⏳ <strong>Due Soon!</strong> Submission deadline is ${formatDate(hw.deadline_date)}`;
    } else {
      bannerText.innerHTML = `✅ <strong>Active Homework</strong> • Please submit by ${formatDate(hw.deadline_date)}`;
    }
  }

  // Attachment Section
  const attachmentSection = document.getElementById('attachmentSection');
  if (attachmentSection) {
    if (hw.file_name) {
      attachmentSection.style.display = 'block';
      setText('attachmentName', hw.file_original_name || hw.file_name);
      setText('attachmentSize', formatBytes(hw.file_size));

      const downloadBtn = document.getElementById('downloadBtn');
      if (downloadBtn) {
        downloadBtn.href = hw.fileUrl;
        downloadBtn.setAttribute('download', hw.file_original_name || 'homework-attachment');
      }

      // Check if image for visual inline preview
      const ext = (hw.file_original_name || hw.file_name).split('.').pop().toLowerCase();
      const imagePreviewContainer = document.getElementById('imagePreviewContainer');
      const previewImg = document.getElementById('previewImg');
      const fileIcon = document.getElementById('fileTypeIcon');

      if (['jpg', 'jpeg', 'png'].includes(ext)) {
        if (fileIcon) {
          fileIcon.textContent = '🖼️';
          fileIcon.className = 'file-type-icon img';
        }
        if (imagePreviewContainer && previewImg) {
          previewImg.src = hw.fileUrl;
          imagePreviewContainer.style.display = 'flex';
        }
      } else if (ext === 'pdf') {
        if (fileIcon) {
          fileIcon.textContent = '📄';
          fileIcon.className = 'file-type-icon';
        }
      } else {
        if (fileIcon) {
          fileIcon.textContent = '📝';
          fileIcon.className = 'file-type-icon doc';
        }
      }
    } else {
      attachmentSection.style.display = 'none';
    }
  }

  // Video Section
  const videoSection = document.getElementById('videoSection');
  const videoFrame = document.getElementById('videoFrame');
  const videoDirectLink = document.getElementById('videoDirectLink');

  if (videoSection) {
    if (hw.youtubeEmbedUrl) {
      videoSection.style.display = 'block';
      if (videoFrame) videoFrame.src = hw.youtubeEmbedUrl;
      if (videoDirectLink) videoDirectLink.href = hw.video_url;
    } else if (hw.video_url) {
      videoSection.style.display = 'block';
      if (videoFrame) videoFrame.style.display = 'none';
      if (videoDirectLink) {
        videoDirectLink.href = hw.video_url;
        videoDirectLink.style.display = 'inline-flex';
      }
    } else {
      videoSection.style.display = 'none';
    }
  }

  // WhatsApp & Share Links
  const waShareBtn = document.getElementById('waShareBtn');
  if (waShareBtn) {
    waShareBtn.href = hw.whatsappShareUrl;
  }

  const copyLinkBtn = document.getElementById('copyLinkBtn');
  if (copyLinkBtn) {
    copyLinkBtn.onclick = () => {
      copyToClipboard(hw.shareableUrl, 'Homework link copied! Send it on WhatsApp.');
    };
  }

  const printBtn = document.getElementById('printBtn');
  if (printBtn) {
    printBtn.onclick = () => window.print();
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || '';
}

function showErrorState(msg) {
  const loader = document.getElementById('hwLoader');
  const content = document.getElementById('hwContent');
  const errorBox = document.getElementById('hwErrorBox');
  const errorMsg = document.getElementById('hwErrorMessage');

  if (loader) loader.style.display = 'none';
  if (content) content.style.display = 'none';
  if (errorMsg) errorMsg.textContent = msg;
  if (errorBox) errorBox.style.display = 'block';
}
