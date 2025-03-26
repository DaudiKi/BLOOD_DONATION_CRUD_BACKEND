// Initialize Socket.IO with authentication
const socket = io({
  auth: { token: localStorage.getItem('token') }
});
const userId = localStorage.getItem('userId');
if (userId) {
  socket.emit('join', userId);
  socket.emit('joinAdmin');
}

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
  spinner.style.display = 'block';
  try {
    const response = await fetch(`/api/notifications?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const notifications = await response.json();
    spinner.style.display = 'none';
    notifications.forEach(notification => updateNotifications(notification));
  } catch (error) {
    spinner.style.display = 'none';
    console.error('Error fetching notifications:', error);
  }
}

fetchNotifications();

// Overview Stats
async function fetchOverviewStats() {
  try {
    const response = await fetch('/api/admin/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const stats = await response.json();
    document.getElementById('total-users').textContent = stats.totalUsers || '0';
    document.getElementById('active-users').textContent = stats.activeUsers || '0';
    document.getElementById('system-uptime').textContent = stats.systemUptime || '0%';
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    showToast('Failed to load overview stats.');
  }
}

fetchOverviewStats();

// Manage Users
let users = [];

async function fetchUsers() {
  try {
    const response = await fetch('/api/users', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    users = await response.json();
    populateUsersTable();
  } catch (error) {
    console.error('Error fetching users:', error);
    showToast('Failed to fetch users.');
  }
}

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

fetchUsers();

// Add/Edit User Modal
function openAddUserModal() {
  document.getElementById('add-user-modal').style.display = 'flex';
}

function closeAddUserModal() {
  document.getElementById('add-user-modal').style.display = 'none';
}

function openEditUserModal(userId) {
  const user = users.find(u => u.id === userId);
  if (user) {
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.id = 'edit-user-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close" onclick="closeEditUserModal()">&times;</span>
        <h2>Edit User</h2>
        <form id="edit-user-form">
          <label for="edit-name">Name:</label>
          <input type="text" id="edit-name" value="${user.name}" required>
          <label for="edit-email">Email:</label>
          <input type="email" id="edit-email" value="${user.email}" required>
          <label for="edit-role">Role:</label>
          <select id="edit-role" required>
            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
          <button type="submit" class="btn">Save Changes</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const updatedUser = {
        name: document.getElementById('edit-name').value,
        email: document.getElementById('edit-email').value,
        role: document.getElementById('edit-role').value
      };
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(updatedUser)
        });
        const result = await response.json();
        const index = users.findIndex(u => u.id === userId);
        users[index] = { ...users[index], ...updatedUser };
        populateUsersTable();
        closeEditUserModal();
        showToast('User updated successfully!', 'success');
        socket.emit('userUpdated', { userId, updatedUser });
      } catch (error) {
        console.error('Error updating user:', error);
        showToast('Failed to update user.');
      }
    });
  }
}

function closeEditUserModal() {
  const modal = document.getElementById('edit-user-modal');
  if (modal) {
    modal.remove();
  }
}

document.getElementById('add-user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newUser = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    role: document.getElementById('role').value
  };
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(newUser)
    });
    const result = await response.json();
    users.push(result.user);
    populateUsersTable();
    closeAddUserModal();
    showToast('User added successfully!', 'success');
    socket.emit('userAdded', result.user);
  } catch (error) {
    console.error('Error adding user:', error);
    showToast('Failed to add user.');
  }
});

async function deleteUser(id) {
  if (confirm('Are you sure you want to delete this user?')) {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      const index = users.findIndex(u => u.id === id);
      if (index !== -1) {
        users.splice(index, 1);
        populateUsersTable();
        showToast('User deleted successfully!', 'success');
        socket.emit('userDeleted', { userId: id });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Failed to delete user.');
    }
  }
}

// Blood Requests Tracking
let bloodRequests = [];

async function fetchBloodRequests() {
  try {
    const response = await fetch('/api/blood-requests', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    bloodRequests = await response.json();
    populateBloodRequestsTable();
  } catch (error) {
    console.error('Error fetching blood requests:', error);
    showToast('Failed to fetch blood requests.');
  }
}

function populateBloodRequestsTable() {
  const tableBody = document.getElementById('blood-requests-table');
  tableBody.innerHTML = '';
  bloodRequests.forEach(request => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${request.request_id}</td>
      <td>${request.patient_name || 'N/A'}</td>
      <td>${request.institution_name || 'N/A'}</td>
      <td>${request.blood_type}</td>
      <td>${request.units_needed}</td>
      <td>${request.urgency_level}</td>
      <td>${new Date(request.request_date).toLocaleString()}</td>
      <td>${request.request_status}</td>
      <td>${request.donor_name || 'Not Matched'}</td>
    `;
    tableBody.appendChild(row);
  });
}

fetchBloodRequests();

// Listen for Real-time Blood Request Updates
socket.on('bloodRequest', (data) => {
  fetchBloodRequests(); // Refresh table
  showToast(data.notification_message, 'success');
});

socket.on('requestAction', (data) => {
  fetchBloodRequests(); // Refresh table
  showToast(data.notification_message, 'success');
});

// System Analytics Chart
const ctx = document.getElementById('active-users-chart').getContext('2d');
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Active Users',
      data: [120, 190, 300, 500, 200, 300, 400],
      backgroundColor: '#D32F2F',
      borderColor: '#D32F2F',
      borderWidth: 1
    }]
  },
  options: {
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});

// User Activity Logs
async function fetchActivityLogs() {
  try {
    const response = await fetch('/api/admin/activity-logs', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const activityLogs = await response.json();
    populateActivityLogs(activityLogs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    showToast('Failed to fetch activity logs.');
  }
}

function populateActivityLogs(activityLogs) {
  const tableBody = document.getElementById('activity-logs');
  tableBody.innerHTML = '';
  activityLogs.forEach(log => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${log.user}</td>
      <td>${log.action}</td>
      <td>${log.timestamp}</td>
    `;
    tableBody.appendChild(row);
  });
}

fetchActivityLogs();

// System Usage Statistics
async function fetchSystemStats() {
  try {
    const response = await fetch('/api/admin/system-stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const stats = await response.json();
    document.getElementById('server-load').textContent = stats.serverLoad || '0%';
    document.getElementById('api-calls').textContent = stats.apiCalls || '0';
    document.getElementById('active-sessions').textContent = stats.activeSessions || '0';
  } catch (error) {
    console.error('Error fetching system stats:', error);
    showToast('Failed to fetch system stats.');
  }
}

fetchSystemStats();

// Generate Report
function generateReport() {
  const report = `
    System Usage Report
    Date: ${new Date().toLocaleDateString()}
    Total Users: ${document.getElementById('total-users').textContent}
    Active Users: ${document.getElementById('active-users').textContent}
    System Uptime: ${document.getElementById('system-uptime').textContent}
    Server Load: ${document.getElementById('server-load').textContent}
    API Calls: ${document.getElementById('api-calls').textContent}
    Active Sessions: ${document.getElementById('active-sessions').textContent}
  `;
  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'system-usage-report.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Report generated successfully!', 'success');
}