/**
 * TEACHER LOGIN SCRIPT
 */

document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const errorAlert = document.getElementById('errorAlert');
  const loginBtn = document.getElementById('loginBtn');
  const demoTeacherBtn = document.getElementById('demoTeacherBtn');
  const demoAdminBtn = document.getElementById('demoAdminBtn');

  // Check if session expired query parameter is present
  const params = new URLSearchParams(window.location.search);
  if (params.get('expired') === 'true') {
    showError('Your session has expired. Please log in again.');
  }

  // If already logged in, redirect directly to dashboard
  const token = API.getToken();
  if (token) {
    try {
      const teacher = await API.checkAuth();
      if (teacher) {
        window.location.href = '/dashboard.html';
        return;
      }
    } catch (e) {
      API.removeToken();
    }
  }

  function showError(msg) {
    if (errorAlert) {
      errorAlert.textContent = msg;
      errorAlert.style.display = 'block';
    } else {
      showToast(msg, 'error');
    }
  }

  function clearError() {
    if (errorAlert) {
      errorAlert.textContent = '';
      errorAlert.style.display = 'none';
    }
  }

  // Quick autofill buttons for convenience
  if (demoTeacherBtn) {
    demoTeacherBtn.addEventListener('click', () => {
      usernameInput.value = 'teacher';
      passwordInput.value = 'teacher123';
      clearError();
    });
  }

  if (demoAdminBtn) {
    demoAdminBtn.addEventListener('click', () => {
      usernameInput.value = 'admin';
      passwordInput.value = 'admin123';
      clearError();
    });
  }

  // Form submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        showError('Please enter both username and password.');
        return;
      }

      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span>Logging in...</span>';

      try {
        const response = await API.login(username, password);
        if (response.success) {
          showToast('Welcome, ' + response.teacher.name, 'success');
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 400);
        } else {
          showError(response.message || 'Login failed. Please check credentials.');
        }
      } catch (err) {
        showError(err.message || 'Invalid username or password.');
      } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>Sign In to Dashboard</span> →';
      }
    });
  }
});
