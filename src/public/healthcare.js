// healthcare.js
// Global variables
let socket = null;

// Session Management
function checkSession() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
    return;
  }
  
  // Check token expiration
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.clear();
      window.location.href = '/login';
    }
  } catch (e) {
    console.error('Error checking session:', e);
    localStorage.clear();
    window.location.href = '/login';
  }
}

// Check session every 5 minutes
setInterval(checkSession, 300000);

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
function initializeSocket() {
  if (socket) {
    socket.disconnect();
  }
  
  socket = io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    auth: { token: localStorage.getItem('token') }
  });

  const userId = localStorage.getItem('userId');
  if (userId) {
    socket.emit('join', userId);
  }

  // Socket Connection Status
  socket.on('connect', () => {
    console.log('Connected to server');
    showToast('Connected to server', 'success');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showToast('Lost connection to server');
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected to server after ' + attemptNumber + ' attempts');
    showToast('Reconnected to server', 'success');
  });

  socket.on('reconnect_failed', () => {
    showToast('Unable to reconnect to server. Please refresh the page.', 'error');
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`Attempting to reconnect... (${attemptNumber})`);
  });

  // Listen for real-time updates
  socket.on('inventory_update', (data) => {
    updateInventory(data);
    showToast('Blood inventory updated', 'info');
  });

  socket.on('new_request', (data) => {
    updateRequestsTable(data);
    showToast('New blood request received', 'info');
  });

  socket.on('donor_matched', (data) => {
    updateDonorMatch(data);
    showToast('Donor matched to request', 'success');
  });

  socket.on('request_fulfilled', (data) => {
    updateRequestStatus(data);
    showToast('Request fulfilled successfully', 'success');
  });
}

// Error Handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showToast('An unexpected error occurred. Please try again.', 'error');
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
    const userType = localStorage.getItem('userType') || 'healthcare_institution';
    
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

// Fetch Institution Data
let institutionData = {};
async function fetchInstitutionData() {
  showLoading('institution-data');
  try {
    const response = await fetch('/api/institutions/me', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch institution data');
    }
    institutionData = await response.json();
    populateOverview();
  } catch (error) {
    console.error('Error fetching institution data:', error);
    showToast('Failed to load institution details.', 'error');
  } finally {
    hideLoading('institution-data');
  }
}

// Blood Requests
let bloodRequests = [];
async function fetchBloodRequests() {
  try {
    const response = await fetch(`/api/institutions/${localStorage.getItem('userId')}/requests`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    bloodRequests = await response.json();
    populateBloodRequests();
    populateOverview();
  } catch (error) {
    console.error('Error fetching blood requests:', error);
    showToast('Failed to load blood requests.');
  }
}

// Inventory Data
let inventoryData = [];
async function fetchInventory() {
  try {
    const response = await fetch(`/api/institutions/${localStorage.getItem('userId')}/inventory`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    inventoryData = await response.json();
    populateInventory();
  } catch (error) {
    console.error('Error fetching inventory:', error);
    showToast('Failed to load inventory.');
  }
}

// Populate Overview
function populateOverview() {
  document.getElementById('institution-name').textContent = institutionData.name || 'N/A';
  document.getElementById('active-requests').textContent = bloodRequests.filter(r => r.request_status === 'pending' || r.request_status === 'matched').length || '0';
  document.getElementById('matched-donors').textContent = bloodRequests.filter(r => r.request_status === 'matched').length || '0';
  document.getElementById('fulfilled-requests').textContent = bloodRequests.filter(r => r.request_status === 'fulfilled').length || '0';
}

fetchInstitutionData();
fetchBloodRequests();
fetchInventory();

// Enhanced form submission with validation
document.getElementById('submit-request-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoading('submit-request-btn');

  const formData = new FormData(e.target);
  const errors = validateForm(formData);
  
  if (errors.length > 0) {
    errors.forEach(error => showToast(error, 'error'));
    hideLoading('submit-request-btn');
    return;
  }

  const newRequest = {
    blood_type: formData.get('blood_type'),
    units_needed: parseInt(formData.get('units_needed')) || 1,
    urgency_level: formData.get('urgency_level'),
    required_by_date: formData.get('required_by_date'),
    location_latitude: parseFloat(formData.get('location_latitude')),
    location_longitude: parseFloat(formData.get('location_longitude'))
  };

  try {
    const response = await fetch('/blood-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(newRequest)
    });

    if (!response.ok) {
      throw new Error('Failed to submit request');
    }

    const result = await response.json();
    showToast('Request submitted successfully!', 'success');
    fetchBloodRequests();
  } catch (error) {
    console.error('Error submitting request:', error);
    showToast('Failed to submit request. Please try again.', 'error');
  } finally {
    hideLoading('submit-request-btn');
  }
});

function updateInventory(data) {
  // Update blood inventory cards
  Object.entries(data).forEach(([bloodType, units]) => {
    const unitElement = document.getElementById(`${bloodType.toLowerCase()}-units`);
    if (unitElement) {
      unitElement.textContent = units;
    }
  });
}

function updateRequestsTable(data) {
  const requestsTable = document.getElementById('requests-table');
  if (!requestsTable) return;

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${data.requestId}</td>
    <td>${data.bloodType}</td>
    <td>${data.unitsNeeded}</td>
    <td><span class="badge badge-${getUrgencyClass(data.urgency)}">${data.urgency}</span></td>
    <td>${data.requiredBy}</td>
    <td><span class="badge badge-${getStatusClass(data.status)}">${data.status}</span></td>
    <td>${data.matchedDonors || 0}</td>
    <td>
      <button class="btn btn-outline" onclick="viewRequest('${data.requestId}')">
        <i class="fas fa-eye"></i>
      </button>
    </td>
  `;
  requestsTable.insertBefore(row, requestsTable.firstChild);
}

function updateDonorMatch(data) {
  const donorsTable = document.getElementById('donors-table');
  if (!donorsTable) return;

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${data.donorId}</td>
    <td>${data.bloodType}</td>
    <td>${data.distance}km</td>
    <td>${data.lastDonation || 'Never'}</td>
    <td><span class="badge badge-${getStatusClass(data.status)}">${data.status}</span></td>
    <td>
      <button class="btn btn-primary" onclick="contactDonor('${data.donorId}')">
        <i class="fas fa-envelope"></i> Contact
      </button>
    </td>
  `;
  donorsTable.insertBefore(row, donorsTable.firstChild);
}

function updateRequestStatus(data) {
  // Implementation needed
}

function getUrgencyClass(urgency) {
  switch(urgency.toLowerCase()) {
    case 'high': return 'danger';
    case 'medium': return 'warning';
    case 'low': return 'info';
    default: return 'secondary';
  }
}

function getStatusClass(status) {
  switch(status.toLowerCase()) {
    case 'pending': return 'warning';
    case 'matched': return 'info';
    case 'fulfilled': return 'success';
    case 'cancelled': return 'danger';
    default: return 'secondary';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  initializeSocket();
  fetchInstitutionData();
  fetchNotifications();
  updateOverviewStats();
});

function initializeCharts() {
  // Blood Type Distribution Chart
  const bloodTypeCtx = document.getElementById('blood-type-chart');
  if (bloodTypeCtx) {
    new Chart(bloodTypeCtx, {
      type: 'doughnut',
      data: {
        labels: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        datasets: [{
          data: [0, 0, 0, 0, 0, 0, 0, 0],
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#36A2EB'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  // Request Trends Chart
  const trendsCtx = document.getElementById('request-trends-chart');
  if (trendsCtx) {
    new Chart(trendsCtx, {
      type: 'line',
      data: {
        labels: Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toLocaleDateString();
        }),
        datasets: [{
          label: 'Requests',
          data: [0, 0, 0, 0, 0, 0, 0],
          borderColor: '#2563eb',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
}
