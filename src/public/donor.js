// donor.js
// Global variables
let socket = null;

// Session Management
function checkSession() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
    return;
  }
  
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
    if (!value && key !== 'optional_field' && key !== 'medical_conditions') {
      errors.push(`${key.replace('_', ' ')} is required`);
    }
  }
  return errors;
}

// Initialize Socket.IO
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

  socket.on('connect', () => {
    console.log('Connected to server');
    showToast('Connected to server', 'success');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showToast('Lost connection to server');
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected after ' + attemptNumber + ' attempts');
    showToast('Reconnected to server', 'success');
  });

  socket.on('reconnect_failed', () => {
    showToast('Unable to reconnect. Please refresh.', 'error');
  });

  socket.on('new_blood_request', (data) => {
    updateRequestsTable(data);
    showToast('New blood request available', 'info');
  });

  socket.on('request_matched', (data) => {
    updateRequestStatus(data);
    showToast('Request matched successfully', 'success');
  });

  socket.on('donation_confirmed', (data) => {
    updateDonationHistory(data);
    showToast('Donation confirmed', 'success');
  });
}

// Toast Notification
function showToast(message, type = 'error') {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.classList.add('toast');
  if (type === 'success') toast.classList.add('success');
  toast.innerHTML = `<i class="fas ${getToastIcon(type)}"></i> ${message}`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
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
    if (!response.ok) throw new Error('Failed to mark notification as read');
    console.log('Notification marked as read');
  } catch (err) {
    console.error('Error marking notification as read:', err);
  }
}

async function fetchNotifications() {
  showLoading('notifications-panel');
  try {
    const response = await fetch(`/api/notifications?userId=${localStorage.getItem('userId')}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch notifications');
    const notifications = await response.json();
    notifications.forEach(updateNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    showToast('Failed to load notifications', 'error');
  } finally {
    hideLoading('notifications-panel');
  }
}

// Fetch Donor Data
let donorData = {};
async function fetchDonorData() {
  showLoading('overview');
  try {
    const response = await fetch('/api/donors/me', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch donor data');
    donorData = await response.json();
    populateDonorDetails();
  } catch (error) {
    console.error('Error fetching donor data:', error);
    showToast('Failed to load donor details', 'error');
  } finally {
    hideLoading('overview');
  }
}

function populateDonorDetails() {
  document.getElementById('donor-name').textContent = donorData.first_name || 'Donor';
  document.getElementById('donor-name-header').textContent = `${donorData.first_name || ''} ${donorData.last_name || ''}`.trim() || 'Donor';
  document.getElementById('total-donations').textContent = donorData.total_donations || '0';
  document.getElementById('last-donation').textContent = donorData.last_donation_date || 'N/A';
  document.getElementById('blood-type').textContent = donorData.blood_type || 'N/A';
  document.getElementById('blood-type-header').textContent = donorData.blood_type || 'N/A';
  document.getElementById('donor-status').textContent = donorData.is_available ? 'Available' : 'Not Available';

  document.getElementById('view-name').textContent = `${donorData.first_name || ''} ${donorData.last_name || ''}`.trim() || 'N/A';
  document.getElementById('view-blood-type').textContent = donorData.blood_type || 'N/A';
  document.getElementById('view-contact-info').textContent = donorData.email || 'N/A';
  document.getElementById('view-phone').textContent = donorData.phone_number || 'N/A';
  document.getElementById('view-address').textContent = donorData.address || 'N/A';
  document.getElementById('view-city').textContent = donorData.city || 'N/A';
  document.getElementById('view-last-donation').textContent = donorData.last_donation_date || 'N/A';
  document.getElementById('view-availability').textContent = donorData.is_available ? 'Available' : 'Not Available';
  document.getElementById('view-medical-conditions').textContent = donorData.medical_conditions || 'None';

  document.getElementById('availability-toggle').checked = donorData.is_available || false;
  document.getElementById('current-availability-status').textContent = donorData.is_available ? 'Available' : 'Not Available';
}

// Fetch Blood Requests
async function fetchBloodRequests() {
  showLoading('blood-requests');
  try {
    const response = await fetch('/api/blood-requests', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch blood requests');
    const requests = await response.json();
    requests.forEach(updateRequestsTable);
  } catch (error) {
    console.error('Error fetching blood requests:', error);
    showToast('Failed to load blood requests', 'error');
  } finally {
    hideLoading('blood-requests');
  }
}

// Helper Functions
function getToastIcon(type) {
  switch(type) {
    case 'success': return 'fa-check-circle';
    case 'error': return 'fa-exclamation-circle';
    case 'warning': return 'fa-exclamation-triangle';
    case 'info': return 'fa-info-circle';
    default: return 'fa-info-circle';
  }
}

function updateRequestsTable(data) {
  const requestsTable = document.getElementById('blood-requests-table');
  if (!requestsTable) return;

  const row = document.createElement('tr');
  row.setAttribute('data-request-id', data.requestId);
  row.innerHTML = `
    <td>${data.requestId}</td>
    <td>${data.bloodType}</td>
    <td>${data.unitsNeeded}</td>
    <td><span class="status-badge status-${getUrgencyClass(data.urgency)}">${data.urgency}</span></td>
    <td>${data.location}</td>
    <td><span class="status-badge status-${getStatusClass(data.status)}">${data.status}</span></td>
    <td>
      <button class="btn btn-primary" onclick="respondToRequest('${data.requestId}')">
        Respond
      </button>
    </td>
  `;
  requestsTable.insertBefore(row, requestsTable.firstChild);
}

function updateRequestStatus(data) {
  const requestRow = document.querySelector(`tr[data-request-id="${data.requestId}"]`);
  if (requestRow) {
    const statusCell = requestRow.cells[5];
    if (statusCell) {
      statusCell.innerHTML = `<span class="status-badge status-${getStatusClass(data.status)}">${data.status}</span>`;
    }
  }
}

function updateDonationHistory(data) {
  const historyTable = document.getElementById('donation-history-table');
  if (!historyTable) return;

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${new Date(data.donationDate).toLocaleDateString()}</td>
    <td>${data.location}</td>
    <td>${data.units}</td>
    <td>${data.recipient || 'Anonymous'}</td>
    <td>
      <button class="btn btn-outline" onclick="viewCertificate('${data.certificateId}')">
        <i class="fas fa-certificate"></i> View
      </button>
    </td>
  `;
  historyTable.insertBefore(row, historyTable.firstChild);
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

// Edit Details
function showEditDetails() {
  document.getElementById('view-details-content').style.display = 'none';
  document.getElementById('edit-details-form').style.display = 'block';
  document.getElementById('edit-phone').value = donorData.phone_number || '';
  document.getElementById('edit-address').value = donorData.address || '';
  document.getElementById('edit-city').value = donorData.city || '';
  document.getElementById('edit-medical').value = donorData.medical_conditions || '';
}

function cancelEditDetails() {
  document.getElementById('edit-details-form').style.display = 'none';
  document.getElementById('view-details-content').style.display = 'block';
}

// Respond to Request
async function respondToRequest(requestId) {
  const action = confirm("Do you want to accept this request? Click 'OK' to accept, 'Cancel' to reject.");
  try {
    showLoading('blood-requests');
    const response = await fetch(`/api/blood-requests/${requestId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ 
        status: action ? 'accepted' : 'rejected',
        donorId: localStorage.getItem('userId')
      })
    });
    
    if (!response.ok) throw new Error('Failed to respond to request');
    
    const result = await response.json();
    showToast(`Request ${action ? 'accepted' : 'rejected'} successfully`, 'success');
    updateRequestStatus({ requestId, status: action ? 'matched' : 'cancelled' });
  } catch (error) {
    console.error('Error responding to request:', error);
    showToast('Failed to respond to request', 'error');
  } finally {
    hideLoading('blood-requests');
  }
}

// Update Availability
async function updateAvailability() {
  const isAvailable = document.getElementById('availability-toggle').checked;
  try {
    showLoading('availability');
    const response = await fetch(`/api/donors/${localStorage.getItem('userId')}/availability`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ is_available: isAvailable })
    });
    
    if (!response.ok) throw new Error('Failed to update availability');
    
    showToast('Availability updated successfully', 'success');
    document.getElementById('current-availability-status').textContent = isAvailable ? 'Available' : 'Not Available';
    document.getElementById('last-availability-update').textContent = new Date().toLocaleString();
    document.getElementById('view-availability').textContent = isAvailable ? 'Available' : 'Not Available';
    document.getElementById('donor-status').textContent = isAvailable ? 'Available' : 'Not Available';
  } catch (error) {
    console.error('Error updating availability:', error);
    showToast('Failed to update availability', 'error');
    document.getElementById('availability-toggle').checked = !isAvailable; // Revert on error
  } finally {
    hideLoading('availability');
  }
}

// Form Submission
document.getElementById('update-details-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoading('view-details');
  
  const formData = new FormData(e.target);
  const errors = validateForm(formData);
  
  if (errors.length > 0) {
    errors.forEach(error => showToast(error, 'error'));
    hideLoading('view-details');
    return;
  }

  try {
    const response = await fetch(`/api/donors/${localStorage.getItem('userId')}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(Object.fromEntries(formData))
    });

    if (!response.ok) throw new Error('Failed to update donor details');

    showToast('Profile updated successfully', 'success');
    await fetchDonorData();
    cancelEditDetails();
  } catch (error) {
    console.error('Error updating donor details:', error);
    showToast('Failed to update profile', 'error');
  } finally {
    hideLoading('view-details');
  }
});

// Sidebar Toggle
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const nav = document.querySelector('nav');
  sidebar.classList.toggle('active');
  nav.classList.toggle('active');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  initializeSocket();
  fetchDonorData();
  fetchNotifications();
  fetchBloodRequests();
});

// Error Handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showToast('An unexpected error occurred', 'error');
});

// Expose functions
window.showEditDetails = showEditDetails;
window.cancelEditDetails = cancelEditDetails;
window.toggleSidebar = toggleSidebar;