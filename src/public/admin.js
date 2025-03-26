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
function showToast(message) {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.classList.add('toast');
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

// Overview Stats (Mock Data - Replace with API call)
document.getElementById('total-users').textContent = '1,245';
document.getElementById('active-users').textContent = '342';
document.getElementById('system-uptime').textContent = '99.9%';

// Manage Users (Mock Data - Replace with API call)
const users = [
  { id: 1, name: 'John Doe', email: 'john@bloodlink.com', role: 'User' },
  { id: 2, name: 'Jane Smith', email: 'jane@bloodlink.com', role: 'Admin' }
];

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
        <button onclick="editUser(${user.id})">Edit</button>
        <button onclick="deleteUser(${user.id})">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

populateUsersTable();

// Add User Modal
function openAddUserModal() {
  document.getElementById('add-user-modal').style.display = 'flex';
}

function closeAddUserModal() {
  document.getElementById('add-user-modal').style.display = 'none';
}

document.getElementById('add-user-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const role = document.getElementById('role').value;
  const newUser = { id: users.length + 1, name, email, role };
  users.push(newUser);
  populateUsersTable();
  closeAddUserModal();
  showToast('User added successfully!');
});

function editUser(id) {
  const user = users.find(u => u.id === id);
  if (user) {
    const name = prompt('Enter new name:', user.name);
    const email = prompt('Enter new email:', user.email);
    const role = prompt('Enter new role (User/Admin):', user.role);
    if (name && email && role) {
      user.name = name;
      user.email = email;
      user.role = role;
      populateUsersTable();
      showToast('User updated successfully!');
    }
  }
}

function deleteUser(id) {
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users.splice(index, 1);
    populateUsersTable();
    showToast('User deleted successfully!');
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
  showToast(data.notification_message);
});

socket.on('requestAction', (data) => {
  fetchBloodRequests(); // Refresh table
  showToast(data.notification_message);
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

// User Activity Logs (Mock Data - Replace with API call)
const activityLogs = [
  { user: 'John Doe', action: 'Logged in', timestamp: '2025-03-25 10:00 AM' },
  { user: 'Jane Smith', action: 'Updated profile', timestamp: '2025-03-25 09:30 AM' }
];

function populateActivityLogs() {
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

populateActivityLogs();

// System Usage Statistics (Mock Data - Replace with API call)
document.getElementById('server-load').textContent = '45%';
document.getElementById('api-calls').textContent = '1,234';
document.getElementById('active-sessions').textContent = '567';

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
  showToast('Report generated successfully!');
}