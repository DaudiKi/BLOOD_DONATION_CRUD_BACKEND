// donor.js
// Global variables
let socket = null;
let bloodRequestsCount = 0;
let pendingBloodRequestsCount = 0;

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
    socket.emit('fetch_notifications');
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

  socket.on('new_blood_request', (request) => {
    console.log('New blood request received:', request); // Debug log
    if (request && request.status && request.status.toLowerCase() === 'pending') {
      pendingBloodRequestsCount++;
      updateBloodRequestsCount();
    }
    fetchBloodRequests(); // Refresh the entire table
  });

  socket.on('request_matched', (data) => {
    updateRequestStatus(data);
    showToast('Request matched successfully', 'success');
    if (data.status?.toLowerCase() === 'matched') {
      bloodRequestsCount--;
      updateBloodRequestsCount();
    }
  });

  socket.on('donation_confirmed', (data) => {
    updateDonationHistory(data);
    showToast('Donation confirmed', 'success');
  });

  socket.on('new_notification', (notification) => {
    notificationsData.unshift(notification);
    populateNotifications();
    showToast(`${notification.notification_title}: ${notification.notification_message}`, 'info');
  });

  socket.on('notifications', (notifications) => {
    notificationsData = notifications;
    populateNotifications();
  });

  socket.on('notifications_error', (error) => {
    console.error('Error fetching notifications via Socket.IO:', error);
    showToast('Failed to load notifications', 'error');
  });

  // New event to handle notifications for patients/institutions
  socket.on('request_response', (data) => {
    showToast(data.message, data.status === 'accepted' ? 'success' : 'warning');
  });
}

// Toast Notification
function showToast(message, type = 'error') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.classList.add('toast');
  if (type === 'success') toast.classList.add('success');
  toast.innerHTML = `<i class="fas ${getToastIcon(type)}"></i> ${message}`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function getToastIcon(type) {
  switch (type) {
    case 'success': return 'fa-check-circle';
    case 'error': return 'fa-exclamation-circle';
    case 'warning': return 'fa-exclamation-triangle';
    case 'info': return 'fa-info-circle';
    default: return 'fa-info-circle';
  }
}

// Notifications Panel
const notificationsPanel = document.getElementById('notifications-panel');
document.getElementById('notifications-icon')?.addEventListener('click', () => {
  if (notificationsPanel) {
  notificationsPanel.style.display = notificationsPanel.style.display === 'block' ? 'none' : 'block';
    if (notificationsPanel.style.display === 'block') {
      socket.emit('fetch_notifications');
    }
  }
});

// Notifications Data Store
let notificationsData = [];

async function fetchNotifications() {
  showLoading('notifications-panel');
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('/api/donor/notifications', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 403) {
      localStorage.clear();
      window.location.href = '/login';
      return;
    }

    if (!response.ok) throw new Error(`Failed to fetch notifications: ${response.status}`);
    const data = await response.json();
    notificationsData = Array.isArray(data) ? data : [];
    populateNotifications();
  } catch (error) {
    console.error('Error fetching notifications:', error);
    showToast('Failed to load notifications', 'error');
  } finally {
    hideLoading('notifications-panel');
  }
}

// Fetch Request Status for a Notification
async function fetchRequestStatus(requestId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return 'unknown';

    const response = await fetch(`/api/donor/blood-requests/${requestId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 404 || response.status === 403) {
      return 'expired';
    }
    
    if (!response.ok) return 'unknown';
    
    const request = await response.json();
    return request.status || request.request_status || 'unknown';
  } catch (error) {
    console.error('Error fetching request status:', error);
    return 'unknown';
  }
}

async function populateNotifications() {
  const badge = document.getElementById('notification-badge');
  const notificationsList = document.getElementById('notifications-list');
  
  if (!badge || !notificationsList) return;

  const unreadCount = notificationsData.filter(n => !n.is_read).length;
  badge.textContent = unreadCount;

  notificationsList.innerHTML = '';

  const userType = localStorage.getItem('userType');

  for (const notification of notificationsData) {
  const li = document.createElement('li');
    li.className = `notification ${notification.is_read ? 'read' : 'unread'}`;
    
    let requestStatus = 'unknown';
    let showButtons = false;
    
    if (notification.related_request_id && notification.notification_type === 'blood_request') {
      requestStatus = await fetchRequestStatus(notification.related_request_id);
      showButtons = requestStatus.toLowerCase() === 'pending' && userType === 'donor';
    }

    li.innerHTML = `
      <div>
        <strong>${notification.notification_title}</strong>
        <p>${notification.notification_message}</p>
        <small>${new Date(notification.created_at).toLocaleString()}</small>
        ${
          notification.related_request_id && requestStatus !== 'expired'
            ? `<a href="/request/${notification.related_request_id}" class="notification-link">View Request</a>`
            : ''
        }
        ${
          showButtons
            ? `
              <div class="notification-actions">
                <button class="btn btn-primary btn-sm" onclick="handleNotificationResponse('${notification.notification_id}', '${notification.related_request_id}', 'accepted')">Approve</button>
                <button class="btn btn-outline btn-sm" onclick="handleNotificationResponse('${notification.notification_id}', '${notification.related_request_id}', 'rejected')">Reject</button>
              </div>
            `
            : requestStatus !== 'unknown' && requestStatus !== 'expired'
              ? `<p><small>Status: ${requestStatus}</small></p>`
              : ''
        }
      </div>
    `;
    
    li.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A' && !notification.is_read) {
    markNotificationAsRead(notification.notification_id);
      }
  });
  notificationsList.appendChild(li);
  }
}

async function handleNotificationResponse(notificationId, requestId, action) {
  try {
    await respondToRequest(requestId, action === 'accepted');
    await markNotificationAsRead(notificationId);
    await fetchNotifications();

    const token = localStorage.getItem('token');
    const response = await fetch(`/api/donor/blood-requests/${requestId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const request = await response.json();
    
    const notificationMessage = action === 'accepted'
      ? `Your blood request (ID: ${requestId}) has been approved by a donor.`
      : `Your blood request (ID: ${requestId}) has been rejected by a donor.`;
    
    socket.emit('notify_request_response', {
      requestId: requestId,
      patientId: request.patient_id,
      institutionId: request.institution_id,
      message: notificationMessage,
      status: action === 'accepted' ? 'accepted' : 'rejected'
    });

  } catch (error) {
    console.error('Error handling notification response:', error);
    showToast('Failed to process request', 'error');
  }
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
    console.log('Notification marked as read:', notificationId);
    const notification = notificationsData.find(n => n.notification_id === notificationId);
    if (notification) {
      notification.is_read = true;
      populateNotifications();
    }
  } catch (err) {
    console.error('Error marking notification as read:', err);
    showToast('Failed to mark notification as read', 'error');
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
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('/api/donor/blood-requests', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 403) {
      localStorage.clear();
      window.location.href = '/login';
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch blood requests: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Blood requests data:', data); // Debug log
    
    // Handle both array and object responses
    const requests = Array.isArray(data) ? data : (data.requests || []);
    console.log('Processed requests:', requests); // Debug log
    
    // Update pending count
    pendingBloodRequestsCount = requests.filter(request => 
      request && request.status && request.status.toLowerCase() === 'pending'
    ).length;
    
    console.log('Pending count:', pendingBloodRequestsCount); // Debug log
    
    updateBloodRequestsCount();
    updateBloodRequestsTable(requests);
  } catch (error) {
    console.error('Error fetching blood requests:', error);
    showToast(`Failed to load blood requests: ${error.message}`, 'error');
    pendingBloodRequestsCount = 0;
    updateBloodRequestsCount();
    updateBloodRequestsTable([]);
  } finally {
    hideLoading('blood-requests');
  }
}

function updateBloodRequestsCount() {
  const countElement = document.getElementById('pending-requests-count');
  if (countElement) {
    countElement.textContent = pendingBloodRequestsCount;
  }
}

function updateBloodRequestsTable(requests) {
  console.log('Updating table with requests:', requests); // Debug log
  
  const tableBody = document.querySelector('#blood-requests-table tbody');
  if (!tableBody) {
    console.error('Table body not found'); // Debug log
    return;
  }

  tableBody.innerHTML = '';
  if (!Array.isArray(requests) || requests.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No blood requests found</td></tr>';
    return;
  }

  requests.forEach(request => {
    if (!request) return;
    
    const status = (request.status || request.request_status || '').toLowerCase();
    console.log(`Processing request ${request.request_id} with status ${status}`); // Debug log
    
    const row = document.createElement('tr');
    row.setAttribute('data-request-id', request.request_id);
    
    row.innerHTML = `
      <td>${request.request_id || 'N/A'}</td>
      <td>${request.blood_type || 'N/A'}</td>
      <td>${request.units_needed || '0'}</td>
      <td>${request.required_by_date ? new Date(request.required_by_date).toLocaleDateString() : 'N/A'}</td>
      <td><span class="badge badge-${getStatusClass(status)}">${status || 'unknown'}</span></td>
      <td class="action-buttons">
        ${status === 'pending' ? `
          <button class="btn btn-success btn-sm accept-btn" onclick="respondToRequest('${request.request_id}', true)">
            <i class="fas fa-check"></i> Accept
          </button>
          <button class="btn btn-danger btn-sm reject-btn" onclick="respondToRequest('${request.request_id}', false)">
            <i class="fas fa-times"></i> Reject
          </button>
        ` : ''}
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function updateRequestStatus(data) {
  if (!data || !data.requestId) return;
  
  const requestRow = document.querySelector(`tr[data-request-id="${data.requestId}"]`);
  if (requestRow) {
    const statusCell = requestRow.querySelector('td:nth-child(5)');
    const actionCell = requestRow.querySelector('td:nth-child(6)');
    
    if (statusCell) {
      const status = (data.status || '').toLowerCase();
      statusCell.innerHTML = `<span class="badge badge-${getStatusClass(status)}">${status}</span>`;
    }
    
    if (actionCell) {
      actionCell.innerHTML = data.status.toLowerCase() === 'pending' ? `
        <button class="btn btn-success btn-sm accept-btn" onclick="respondToRequest('${data.requestId}', true)">
          <i class="fas fa-check"></i> Accept
        </button>
        <button class="btn btn-danger btn-sm reject-btn" onclick="respondToRequest('${data.requestId}', false)">
          <i class="fas fa-times"></i> Reject
        </button>
      ` : '';
    }
    
    if (data.status.toLowerCase() !== 'pending') {
      pendingBloodRequestsCount = Math.max(0, pendingBloodRequestsCount - 1);
      updateBloodRequestsCount();
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

function getStatusClass(status) {
  if (!status) return 'secondary';
  switch(status.toLowerCase()) {
    case 'pending': return 'warning';
    case 'accepted': return 'success';
    case 'rejected': return 'danger';
    case 'matched': return 'info';
    case 'fulfilled': return 'success';
    case 'cancelled': return 'danger';
    default: return 'secondary';
  }
}

// Respond to Request
async function respondToRequest(requestId, isAccepted) {
  if (!requestId) {
    showToast('Invalid request ID', 'error');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    showLoading('blood-requests-section');
    const response = await fetch(`/api/donor/blood-requests/${requestId}/${isAccepted ? 'accept' : 'reject'}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 403) {
      localStorage.clear();
      window.location.href = '/login';
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to respond to request: ${errorText}`);
    }
    
    updateRequestStatus({
      requestId: requestId,
      status: isAccepted ? 'accepted' : 'rejected'
    });
    
    await fetchBloodRequests();
    
    showToast(`Successfully ${isAccepted ? 'accepted' : 'rejected'} the request`, 'success');

    const requestResponse = await fetch(`/api/donor/blood-requests/${requestId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (requestResponse.ok) {
      const request = await requestResponse.json();
      const notificationMessage = isAccepted
        ? `Your blood request (ID: ${requestId}) has been accepted by a donor.`
        : `Your blood request (ID: ${requestId}) has been rejected by a donor.`;
      
      socket.emit('notify_request_response', {
        requestId: requestId,
        patientId: request.patient_id,
        institutionId: request.institution_id,
        message: notificationMessage,
        status: isAccepted ? 'accepted' : 'rejected'
      });
    }
  } catch (error) {
    console.error('Error responding to request:', error);
    showToast(`Failed to respond to request: ${error.message}`, 'error');
  } finally {
    hideLoading('blood-requests-section');
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
    document.getElementById('availability-toggle').checked = !isAvailable;
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
window.handleNotificationResponse = handleNotificationResponse;