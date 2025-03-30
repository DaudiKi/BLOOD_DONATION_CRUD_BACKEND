// admin.js
// Global variables
let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Session Management
function checkSession() {
  const token = localStorage.getItem('token');
  const userType = localStorage.getItem('userType');

  console.log('Checking session...', { token: !!token, userType });

  // Only redirect if we're on the admin dashboard page
  const isOnDashboard = window.location.pathname.includes('admin-dashboard');
  
  if (!token || !userType) {
    console.log('No token or user type');
    if (isOnDashboard) {
      window.location.href = '/';
    }
    return false;
  }

  if (userType !== 'admin') {
    console.log('Not admin user type');
    if (isOnDashboard) {
      window.location.href = '/';
    }
    return false;
  }
  
  // Check token expiration
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token payload:', payload);

    // Check expiration
    if (payload.exp * 1000 < Date.now()) {
      console.log('Token expired');
      localStorage.clear();
      if (isOnDashboard) {
        window.location.href = '/';
      }
      return false;
    }

    // Verify admin role
    if (payload.role !== 'admin') {
      console.log('Not admin role');
      localStorage.clear();
      if (isOnDashboard) {
        window.location.href = '/';
      }
      return false;
    }

    // Store user info if not already stored
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', payload.userId);
      localStorage.setItem('userEmail', payload.email);
      localStorage.setItem('userRole', payload.role);
    }

    // Update admin name in the dashboard
    const adminNameElement = document.getElementById('admin-name');
    if (adminNameElement) {
      adminNameElement.textContent = payload.email.split('@')[0];
    }

    return true;
  } catch (e) {
    console.error('Error checking session:', e);
    localStorage.clear();
    if (isOnDashboard) {
      window.location.href = '/';
    }
    return false;
  }
}

// Initialize admin dashboard
async function initializeDashboard() {
  try {
    console.log('Initializing dashboard...');
    
    // Only proceed if we're on the admin dashboard page
    if (!window.location.pathname.includes('admin-dashboard')) {
      console.log('Not on admin dashboard, skipping initialization');
      return;
    }
    
    // Check session first
    if (!checkSession()) {
      console.log('Session check failed');
      return;
    }
    
    console.log('Session valid, initializing socket...');
    // Initialize socket connection
    await initializeSocket().catch(error => {
      console.error('Socket initialization failed:', error);
      // Don't redirect on socket failure, just show error
      showToast('Failed to connect to server. Some features may be limited.', 'warning');
    });
    
    console.log('Socket initialized, fetching data...');
    // Fetch initial data
    await Promise.all([
      fetchOverviewStats().catch(console.error),
      fetchUsers().catch(console.error),
      fetchNotifications().catch(console.error)
    ]);
    
    console.log('Initial data fetched, setting up updates...');
    // Set up periodic updates
    const updateInterval = setInterval(() => {
      if (!checkSession()) {
        clearInterval(updateInterval);
        return;
      }
      fetchOverviewStats().catch(console.error);
      fetchNotifications().catch(console.error);
    }, 30000); // Update every 30 seconds
    
  } catch (error) {
    console.error('Dashboard initialization error:', error);
    showToast('Error initializing dashboard. Some features may be limited.', 'warning');
  }
}

// Call initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Loading State Management
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.add('loading');
  }
}

function hideLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.remove('loading');
  }
}

// Form Validation
function validateForm(formData) {
  const errors = [];
  for (const [key, value] of formData.entries()) {
    if (!value && key !== 'optional_field') {
      errors.push(`${key.replace('_', ' ')} is required`);
    }
  }
  return errors;
}

// Initialize Socket.IO with authentication
async function initializeSocket() {
  return new Promise((resolve, reject) => {
    try {
      if (socket) {
        socket.disconnect();
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Create socket instance
      socket = io({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        transports: ['websocket', 'polling'],
        auth: { 
          token,
          userType: 'admin'
        },
        path: '/socket.io'
      });

      let connectionTimeout = setTimeout(() => {
        console.error('Socket connection timeout');
        reject(new Error('Connection timeout'));
      }, 5000);

      // Socket Connection Status
      socket.on('connect', () => {
        clearTimeout(connectionTimeout);
        console.log('Connected to server');
        reconnectAttempts = 0;
        socket.emit('joinAdmin');
        showToast('Connected to server', 'success');
        resolve();
      });

      socket.on('admin_connected', (data) => {
        console.log('Admin connected:', data);
        localStorage.setItem('lastConnected', new Date().toISOString());
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reconnectAttempts++;
        showToast(`Connection error (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`, 'error');
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          socket.disconnect();
          reject(error);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        if (reason === 'io server disconnect' || reason === 'transport close') {
          // Server initiated disconnect or transport closed, attempt to reconnect
          console.log('Attempting to reconnect...');
          socket.connect();
        }
        showToast('Lost connection to server. Attempting to reconnect...', 'warning');
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected to server after ' + attemptNumber + ' attempts');
        socket.emit('joinAdmin');
        showToast('Reconnected to server', 'success');
        reconnectAttempts = 0;
      });

      socket.on('reconnect_error', (error) => {
        console.error('Reconnection error:', error);
        reconnectAttempts++;
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          showToast('Unable to reconnect to server. Please refresh the page.', 'error');
          reject(error);
        }
      });

      socket.on('reconnect_failed', () => {
        console.error('Reconnection failed after all attempts');
        showToast('Unable to reconnect to server. Please refresh the page.', 'error');
        reject(new Error('Reconnection failed'));
      });

      // Listen for real-time updates
      socket.on('user_activity', (data) => {
        if (data && typeof updateActivityLog === 'function') {
          updateActivityLog(data);
          showToast('New user activity recorded', 'info');
        }
      });

      socket.on('system_alert', (data) => {
        if (data && typeof updateSystemHealth === 'function') {
          updateSystemHealth(data);
          showToast(`System alert: ${data.message}`, data.type || 'info');
        }
      });

      // Handle auth errors
      socket.on('auth_error', (error) => {
        console.error('Authentication error:', error);
        showToast('Authentication failed. Please log in again.', 'error');
        handleLogout();
      });

    } catch (error) {
      console.error('Socket initialization error:', error);
      reject(error);
    }
  });
}

// Error Handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showToast('An unexpected error occurred. Please try again.', 'error');
});

// Enhanced API calls with loading states
async function fetchOverviewStats() {
  showLoading('overview-stats');
  try {
    const response = await fetch('/api/admin/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch overview stats');
    }
    const stats = await response.json();
    document.getElementById('total-users').textContent = stats.totalUsers || '0';
    document.getElementById('active-users').textContent = stats.activeUsers || '0';
    document.getElementById('system-uptime').textContent = stats.systemUptime || '0%';
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    showToast('Failed to load overview stats.', 'error');
  } finally {
    hideLoading('overview-stats');
  }
}

// User Management
async function fetchUsers(userType = 'all') {
  showLoading('users-table');
  try {
    const response = await fetch(`/api/admin/users/${userType}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const users = await response.json();
    updateUsersTable(users);

  } catch (error) {
    console.error('Error fetching users:', error);
    showToast('Failed to fetch users: ' + error.message, 'error');
  } finally {
    hideLoading('users-table');
  }
}

// Update Users Table
function updateUsersTable(users) {
  const tableBody = document.getElementById('users-table');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  users.forEach(user => {
    const row = document.createElement('tr');
    row.dataset.userId = user.user_id;
    
    const statusClass = user.is_active ? 'active' : 'inactive';
    const verifiedClass = user.is_verified ? 'verified' : 'unverified';

    row.innerHTML = `
      <td>${user.user_id}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.user_type}</td>
      <td><span class="status ${statusClass}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
      <td><span class="status ${verifiedClass}">${user.is_verified ? 'Verified' : 'Unverified'}</span></td>
      <td class="actions">
        ${!user.is_verified ? `
          <button class="btn btn-success btn-sm" onclick="verifyUser('${user.user_id}')">
            <i class="fas fa-check"></i> Verify
          </button>
        ` : ''}
        <button class="btn ${user.is_active ? 'btn-danger' : 'btn-success'} btn-sm" 
                onclick="toggleUserStatus('${user.user_id}', ${!user.is_active})">
          <i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i>
          ${user.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
}

// Verify User
async function verifyUser(userId) {
  try {
    const response = await fetch(`/api/admin/users/${userId}/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to verify user');
    }

    showToast('User verified successfully', 'success');
    await fetchUsers();

  } catch (error) {
    console.error('Error verifying user:', error);
    showToast('Failed to verify user: ' + error.message, 'error');
  }
}

// Toggle User Status
async function toggleUserStatus(userId, newStatus) {
  try {
    const response = await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ is_active: newStatus })
    });

    if (!response.ok) {
      throw new Error('Failed to update user status');
    }

    showToast(`User ${newStatus ? 'activated' : 'deactivated'} successfully`, 'success');
    await fetchUsers();

  } catch (error) {
    console.error('Error updating user status:', error);
    showToast('Failed to update user status: ' + error.message, 'error');
  }
}

// Activity Tracking
async function fetchActivityLog() {
  showLoading('activity-log');
  try {
    const response = await fetch('/api/admin/activity-log', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch activity log');
    }

    const activities = await response.json();
    updateActivityLog(activities);

  } catch (error) {
    console.error('Error fetching activity log:', error);
    showToast('Failed to fetch activity log: ' + error.message, 'error');
  } finally {
    hideLoading('activity-log');
  }
}

// Update Activity Log
function updateActivityLog(activities) {
  const logContainer = document.getElementById('activity-log');
  if (!logContainer) return;
  
  logContainer.innerHTML = '';
  activities.forEach(activity => {
    const activityElement = document.createElement('div');
    activityElement.className = 'activity-item';
    
    const timestamp = new Date(activity.timestamp).toLocaleString();
    const actionClass = {
      'create': 'success',
      'update': 'info',
      'delete': 'danger',
      'verify': 'warning'
    }[activity.action_type] || 'default';

    activityElement.innerHTML = `
      <div class="activity-header">
        <span class="activity-type ${actionClass}">${activity.action_type}</span>
        <span class="activity-time">${timestamp}</span>
      </div>
      <div class="activity-content">
        <p>${activity.description}</p>
        <small>By: ${activity.user_name} (${activity.user_type})</small>
      </div>
    `;
    
    logContainer.appendChild(activityElement);
  });
}

// Initialize Admin Dashboard
async function initializeAdminDashboard() {
  try {
    await Promise.all([
      fetchUsers(),
      fetchActivityLog(),
      initializeSocket()
    ]);
    
    // Set up periodic updates
    setInterval(fetchUsers, 300000); // Every 5 minutes
    setInterval(fetchActivityLog, 60000); // Every minute
    
  } catch (error) {
    console.error('Error initializing admin dashboard:', error);
    showToast('Failed to initialize dashboard: ' + error.message, 'error');
  }
}

// Enhanced Socket Event Listeners for Admin
socket.on('user_registered', (data) => {
  showToast(`New ${data.userType} registered: ${data.name}`, 'info');
  fetchUsers();
  fetchActivityLog();
});

socket.on('request_created', (data) => {
  showToast(`New blood request from ${data.patientName}`, 'info');
  fetchActivityLog();
});

socket.on('request_matched', (data) => {
  showToast(`Request #${data.requestId} matched with donor ${data.donorName}`, 'success');
  fetchActivityLog();
});

socket.on('request_fulfilled', (data) => {
  showToast(`Request #${data.requestId} fulfilled successfully`, 'success');
  fetchActivityLog();
});

// Toast Notification
function showToast(message, type = 'error') {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.classList.add('toast');
  if (type === 'success') {
    toast.classList.add('success');
  }
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 5000);
}

// Notifications Panel
const notificationsPanel = document.getElementById('notifications-panel');
document.getElementById('notifications-icon').addEventListener('click', () => {
  notificationsPanel.style.display = notificationsPanel.style.display === 'block' ? 'none' : 'block';
});

function updateNotifications(notification) {
  const badge = document.getElementById('notification-badge');
  let count = parseInt(badge.textContent) || 0;
  count++;
  badge.textContent = count;

  const notificationsList = document.getElementById('notifications-list');
  const li = document.createElement('li');
  li.textContent = notification.notification_message || 'New notification';
  li.addEventListener('click', () => {
    markNotificationAsRead(notification.notification_id);
    li.style.textDecoration = 'line-through';
    count = Math.max(0, count - 1);
    badge.textContent = count;
  });
  notificationsList.appendChild(li);
}

async function markNotificationAsRead(notificationId) {
  try {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    console.log('Notification marked as read:', data);
  } catch (err) {
    console.error('Error marking notification as read:', err);
  }
}

async function fetchNotifications() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
  spinner.style.display = 'block';
  }
  
  try {
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType') || 'admin';
    
    const response = await fetch(`/api/notifications?userId=${userId}&userType=${userType}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.status}`);
    }
    
    const notifications = await response.json();
    if (spinner) {
    spinner.style.display = 'none';
    }
    notifications.forEach(notification => updateNotifications(notification));
  } catch (error) {
    if (spinner) {
    spinner.style.display = 'none';
    }
    console.error('Error fetching notifications:', error);
    showToast('Failed to load notifications', 'error');
  }
}

fetchNotifications();

// Manage Users
let users = [];

function populateUsersTable() {
  const tableBody = document.getElementById('users-table');
  tableBody.innerHTML = '';
  users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>
        <button class="btn" onclick="openEditUserModal(${user.id})">Edit</button>
        <button class="btn secondary-btn" onclick="deleteUser(${user.id})">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

window.openEditUserModal = openEditUserModal;
window.deleteUser = deleteUser;

// Add logout function
function handleLogout() {
  console.log('Logging out...');
  // Disconnect socket
  if (socket) {
    socket.disconnect();
  }
  // Clear local storage
  localStorage.clear();
  // Redirect to login page
  window.location.href = '/';
}

// Make handleLogout available globally
window.handleLogout = handleLogout;
