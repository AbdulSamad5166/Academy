/**
 * APEX TUITION ACADEMY - API & UTILITY HELPERS
 * Pure Vanilla JavaScript
 */

const API = {
  // Token management
  getToken() {
    return localStorage.getItem('apex_teacher_token') || null;
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('apex_teacher_token', token);
    }
  },

  removeToken() {
    localStorage.removeItem('apex_teacher_token');
    localStorage.removeItem('apex_teacher_info');
  },

  getTeacherInfo() {
    const raw = localStorage.getItem('apex_teacher_info');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setTeacherInfo(info) {
    localStorage.setItem('apex_teacher_info', JSON.stringify(info));
  },

  // Generic request wrapper
  async request(endpoint, options = {}) {
    const headers = options.headers || {};
    const token = this.getToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({
        success: false,
        message: 'Non-JSON response from server'
      }));

      if (!response.ok) {
        if (response.status === 401 && window.location.pathname.includes('dashboard')) {
          this.removeToken();
          window.location.href = '/login.html?expired=true';
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Auth endpoints
  async login(username, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (data.token) {
      this.setToken(data.token);
      this.setTeacherInfo(data.teacher);
    }
    return data;
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    this.removeToken();
    window.location.href = '/login.html';
  },

  async checkAuth() {
    try {
      const data = await this.request('/api/auth/me');
      return data.teacher;
    } catch (e) {
      return null;
    }
  },

  // Homework endpoints
  async getHomework(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.className) searchParams.append('className', params.className);
    if (params.subject) searchParams.append('subject', params.subject);
    if (params.status) searchParams.append('status', params.status);

    const queryString = searchParams.toString();
    const url = `/api/homework${queryString ? '?' + queryString : ''}`;
    return this.request(url);
  },

  async getHomeworkById(idOrCode) {
    return this.request(`/api/homework/${encodeURIComponent(idOrCode)}`);
  },

  async getStats() {
    return this.request('/api/homework/stats');
  },

  async getFilters() {
    return this.request('/api/homework/filters');
  },

  async createHomework(formData) {
    return this.request('/api/homework', {
      method: 'POST',
      body: formData
    });
  },

  async updateHomework(idOrCode, formData) {
    return this.request(`/api/homework/${encodeURIComponent(idOrCode)}`, {
      method: 'PUT',
      body: formData
    });
  },

  async deleteHomework(idOrCode) {
    return this.request(`/api/homework/${encodeURIComponent(idOrCode)}`, {
      method: 'DELETE'
    });
  }
};

// Toast notification helper
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Clipboard copy helper
async function copyToClipboard(text, message = 'Link copied to clipboard!') {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showToast(message, 'success');
      return true;
    }
  } catch (err) {
    // fallback
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast(message, 'success');
    document.body.removeChild(textArea);
    return true;
  } catch (err) {
    document.body.removeChild(textArea);
    showToast('Failed to copy. Please copy manually.', 'error');
    return false;
  }
}

// Format Date nicely
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

// Format file size
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper to escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
