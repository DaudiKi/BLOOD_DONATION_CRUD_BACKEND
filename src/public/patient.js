// patient.js
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
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found for socket authentication');
    return;
  }

  socket = io({
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('Connected to server');
    showToast('Connected to server', 'success');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showToast('Lost connection to server', 'warning');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    showToast('Connection error: ' + error.message, 'error');
  });

  // Set up event listeners for blood request updates
  socket.on('request_status_update', (data) => {
    updateRequestStatus(data);
    showToast(`Request ${data.requestId} status updated to ${data.status}`, 'info');
  });

  socket.on('donor_matched', (data) => {
    showToast(`A donor has been matched to your request #${data.requestId}`, 'success');
    fetchRequests();
  });
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
  if (spinner) {
    spinner.style.display = 'block';
  }
  
  try {
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType') || 'patient';
    
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

// Fetch Patient Data
let patientData = {};
async function fetchPatientData(retryCount = 0) {
  const maxRetries = 3;
  showLoading('patient-profile');
  
  try {
    const response = await fetch('/api/patients/me', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Patient profile not found. Please complete registration.');
      } else if (response.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    }
    
    patientData = await response.json();
    populatePatientDetails();
    showToast('Profile loaded successfully', 'success');
  } catch (error) {
    console.error('Error fetching patient data:', error);
    
    if (retryCount < maxRetries && error.message.includes('Server error')) {
      console.log(`Retrying fetch patient data (${retryCount + 1}/${maxRetries})...`);
      setTimeout(() => fetchPatientData(retryCount + 1), 1000 * (retryCount + 1));
    } else {
      showToast(error.message || 'Failed to load patient details.', 'error');
    }
  } finally {
    hideLoading('patient-profile');
  }
}

function populatePatientDetails() {
  const elements = {
    'patient-name': patientData.first_name,
    'blood-type': patientData.blood_type,
    'view-name': `${patientData.first_name || ''} ${patientData.last_name || ''}`.trim(),
    'view-blood-type': patientData.blood_type,
    'view-contact-info': patientData.email,
    'view-phone': patientData.phone_number,
    'view-address': patientData.address,
    'view-city': patientData.city,
    'view-medical-conditions': patientData.medical_conditions,
    'view-emergency-contact': `${patientData.emergency_contact_name || 'N/A'} (${patientData.emergency_contact_phone || 'N/A'})`
  };

  for (const [id, value] of Object.entries(elements)) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value || 'N/A';
    }
  }
}

// Show/Hide Edit Details Form
function showEditDetails() {
  document.getElementById('view-details').style.display = 'none';
  const editSection = document.getElementById('edit-details');
  editSection.style.display = 'block';

  document.getElementById('edit-first-name').value = patientData.first_name || '';
  document.getElementById('edit-last-name').value = patientData.last_name || '';
  document.getElementById('edit-email').value = patientData.email || '';
  document.getElementById('edit-phone').value = patientData.phone_number || '';
  document.getElementById('edit-dob').value = patientData.date_of_birth || '';
  document.getElementById('edit-blood').value = patientData.blood_type || '';
  document.getElementById('edit-address').value = patientData.address || '';
  document.getElementById('edit-city').value = patientData.city || '';
  document.getElementById('edit-lat').value = patientData.latitude || '';
  document.getElementById('edit-lng').value = patientData.longitude || '';
  document.getElementById('edit-medical').value = patientData.medical_conditions || '';
  document.getElementById('edit-emergency-name').value = patientData.emergency_contact_name || '';
  document.getElementById('edit-emergency-phone').value = patientData.emergency_contact_phone || '';
}

function cancelEditDetails() {
  document.getElementById('edit-details').style.display = 'none';
  document.getElementById('view-details').style.display = 'block';
}

// Enhanced form submission
document.getElementById('edit-details-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoading('edit-form-submit');

  const formData = new FormData(e.target);
  const errors = validateForm(formData);
  
  if (errors.length > 0) {
    errors.forEach(error => showToast(error, 'error'));
    hideLoading('edit-form-submit');
    return;
  }

  try {
    const response = await fetch(`/api/patients/${localStorage.getItem('userId')}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(Object.fromEntries(formData))
    });

    if (!response.ok) {
      throw new Error('Failed to update patient details');
    }

    const result = await response.json();
    showToast('Profile updated successfully!', 'success');
    await fetchPatientData();
    cancelEditDetails();
  } catch (error) {
    console.error('Error updating patient details:', error);
    showToast('Failed to update profile. Please try again.', 'error');
  } finally {
    hideLoading('edit-form-submit');
  }
});

window.showEditDetails = showEditDetails;
window.cancelEditDetails = cancelEditDetails;

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

function updateRequestStatus(data) {
  const requestRow = document.querySelector(`tr[data-request-id="${data.requestId}"]`);
  if (requestRow) {
    const statusCell = requestRow.querySelector('.status');
    if (statusCell) {
      statusCell.innerHTML = `<span class="badge badge-${getStatusClass(data.status)}">${data.status}</span>`;
    }
  }

  // Update overview stats if needed
  updateOverviewStats();
}

function updateDonorMatch(data) {
  const matchesTable = document.getElementById('matched-donors-table');
  if (!matchesTable) return;

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${data.donorId}</td>
    <td>${data.bloodType}</td>
    <td>${data.matchDate}</td>
    <td>${data.location}</td>
    <td><span class="badge badge-${getStatusClass(data.status)}">${data.status}</span></td>
    <td>
      <button class="btn btn-primary" onclick="contactDonor('${data.donorId}')">
        <i class="fas fa-envelope"></i> Contact
      </button>
    </td>
  `;
  matchesTable.insertBefore(row, matchesTable.firstChild);
}

function updateBloodAvailability(data) {
  const availabilitySection = document.getElementById('blood-availability');
  if (!availabilitySection) return;

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="card-header">
      <h3>Blood Available</h3>
      <i class="fas fa-tint"></i>
    </div>
    <div class="card-value">${data.units} units</div>
    <div class="card-details">
      <span>Blood Type: ${data.bloodType}</span>
      <span>Location: ${data.location}</span>
    </div>
    <button class="btn btn-primary" onclick="confirmRequest('${data.requestId}')">
      Confirm Request
    </button>
  `;
  availabilitySection.insertBefore(card, availabilitySection.firstChild);
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

async function updateOverviewStats() {
  try {
    const response = await fetch('/api/patient/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const stats = await response.json();
      document.getElementById('active-requests').textContent = stats.activeRequests;
      document.getElementById('matched-donors').textContent = stats.matchedDonors;
      document.getElementById('total-requests').textContent = stats.totalRequests;
    }
  } catch (error) {
    console.error('Error updating stats:', error);
    showToast('error', 'Failed to update statistics');
  }
}

// Submit Blood Request
async function submitBloodRequest(event) {
  event.preventDefault();
  showLoading('submit-request-form');

  const requestData = {
    blood_type: document.getElementById('request-blood-type').value,
    units_needed: parseInt(document.getElementById('request-units').value),
    urgency_level: document.getElementById('request-urgency').value,
    required_by_date: document.getElementById('request-date').value,
    request_notes: document.getElementById('request-notes').value || '',
    location_latitude: 0.0,  // Default coordinates
    location_longitude: 0.0, // Default coordinates
    patient_id: localStorage.getItem('userId')
  };

  try {
    const response = await fetch('/api/blood-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error('Failed to submit blood request');
    }

    const result = await response.json();
    showToast('Blood request submitted successfully', 'success');

    // Emit socket event for real-time updates
    if (socket) {
      socket.emit('blood_request_created', {
        requestId: result.request_id,
        patientId: localStorage.getItem('userId'),
        bloodType: requestData.blood_type,
        urgency: requestData.urgency_level
      });
    }

    // Reset form
    event.target.reset();
    
    // Fetch updated requests
    await fetchRequests();

  } catch (error) {
    console.error('Error submitting blood request:', error);
    showToast('Failed to submit request: ' + error.message, 'error');
  } finally {
    hideLoading('submit-request-form');
  }
}

// Track Blood Requests
async function fetchRequests() {
  showLoading('track-requests');
  try {
    const response = await fetch(`/api/blood-requests/patient/${localStorage.getItem('userId')}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch requests');
    }

    const requests = await response.json();
    updateRequestsTable(requests);
    updateOverviewStats(requests);

  } catch (error) {
    console.error('Error fetching requests:', error);
    showToast('Failed to fetch requests: ' + error.message, 'error');
  } finally {
    hideLoading('track-requests');
  }
}

// Update Requests Table
function updateRequestsTable(requests) {
  const tableBody = document.getElementById('requests-table');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  requests.forEach(request => {
    const row = document.createElement('tr');
    row.dataset.requestId = request.request_id;
    
    const urgencyClass = {
      'High': 'danger',
      'Medium': 'warning',
      'Low': 'info'
    }[request.urgency_level] || 'secondary';

    const statusClass = {
      'Pending': 'warning',
      'Matched': 'info',
      'Fulfilled': 'success',
      'Cancelled': 'danger'
    }[request.request_status] || 'secondary';

    const institutionName = request.institution_id ? 
      `<span class="badge badge-primary">${request.institution_name || 'Hospital #' + request.institution_id}</span>` : 
      '<span class="badge badge-secondary">No Institution</span>';

    row.innerHTML = `
      <td>${request.request_id}</td>
      <td><span class="badge badge-${getBloodTypeClass(request.blood_type)}">${request.blood_type}</span></td>
      <td>${request.units_needed} units</td>
      <td><span class="badge badge-${urgencyClass}">${request.urgency_level}</span></td>
      <td>${institutionName}</td>
      <td>${new Date(request.request_date).toLocaleDateString()}</td>
      <td>${new Date(request.required_by_date).toLocaleDateString()}</td>
      <td><span class="badge badge-${statusClass}">${request.request_status}</span></td>
      <td>${request.request_notes || '-'}</td>
      <td class="actions">
        ${getRequestActions(request)}
      </td>
    `;
    
    tableBody.appendChild(row);
  });

  // Update request count in header if exists
  const requestCount = document.getElementById('request-count');
  if (requestCount) {
    requestCount.textContent = requests.length;
  }
}

// Helper function to get blood type badge class
function getBloodTypeClass(bloodType) {
  const types = {
    'A+': 'success',
    'A-': 'success',
    'B+': 'info',
    'B-': 'info',
    'AB+': 'primary',
    'AB-': 'primary',
    'O+': 'warning',
    'O-': 'warning'
  };
  return types[bloodType] || 'secondary';
}

// Helper function to get request action buttons
function getRequestActions(request) {
  const actions = [];

  switch (request.request_status) {
    case 'Pending':
      actions.push(`
        <button class="btn btn-sm btn-danger" onclick="cancelRequest('${request.request_id}')">
          <i class="fas fa-times"></i> Cancel
        </button>
      `);
      break;
    case 'Matched':
      actions.push(`
        <button class="btn btn-sm btn-info" onclick="viewDonorDetails('${request.request_id}')">
          <i class="fas fa-user"></i> View Donor
        </button>
      `);
      break;
    case 'Fulfilled':
      actions.push(`
        <button class="btn btn-sm btn-success" disabled>
          <i class="fas fa-check"></i> Completed
        </button>
      `);
      break;
  }

  return actions.join('');
}

// Cancel Blood Request
async function cancelRequest(requestId) {
  if (!confirm('Are you sure you want to cancel this request?')) {
    return;
  }

  showLoading('track-requests');
  try {
    const response = await fetch(`/api/blood-requests/${requestId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to cancel request');
    }

    showToast('Request cancelled successfully', 'success');
    await fetchRequests();

    // Emit socket event for real-time updates
    socket.emit('request_cancelled', {
      requestId,
      patientId: localStorage.getItem('userId')
    });

  } catch (error) {
    console.error('Error cancelling request:', error);
    showToast('Failed to cancel request: ' + error.message, 'error');
  } finally {
    hideLoading('track-requests');
  }
}

// View Donor Details
function viewDonorDetails(requestId) {
  showLoading('track-requests');
  fetch(`/api/blood-requests/${requestId}/donor`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
    .then(response => response.json())
    .then(donor => {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <h3>Matched Donor Details</h3>
          <div class="donor-details">
            <p><strong>Name:</strong> ${donor.name}</p>
            <p><strong>Blood Type:</strong> ${donor.blood_type}</p>
            <p><strong>Contact:</strong> ${donor.contact_info}</p>
            <p><strong>Location:</strong> ${donor.city}</p>
            <p><strong>Status:</strong> <span class="badge badge-success">Matched</span></p>
          </div>
          <div class="button-group">
            <button class="btn btn-outline" onclick="this.closest('.modal').remove()">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    })
    .catch(error => {
      console.error('Error fetching donor details:', error);
      showToast('Failed to fetch donor details', 'error');
    })
    .finally(() => {
      hideLoading('track-requests');
    });
}

// Fetch and populate healthcare institutions
async function populateHospitalDropdown() {
  try {
    const response = await fetch('/api/healthcare-institutions', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch hospitals');
    }

    const institutions = await response.json();
    const dropdown = document.getElementById('request-hospital');
    
    // Clear existing options except the first one
    while (dropdown.options.length > 1) {
      dropdown.remove(1);
    }

    // Add institutions to dropdown
    institutions.forEach(institution => {
      const option = document.createElement('option');
      option.value = institution.institution_id;
      option.textContent = institution.name;
      dropdown.appendChild(option);
    });
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    showToast('Failed to load hospitals', 'error');
  }
}

// Initialize everything with error handling
document.addEventListener('DOMContentLoaded', async () => {
  try {
    checkSession();
    initializeSocket();
    
    // Fetch data sequentially to avoid race conditions
    await fetchPatientData().catch(error => {
      console.error('Error in fetchPatientData:', error);
      showToast('Failed to load patient data', 'error');
    });
    
    await fetchNotifications().catch(error => {
      console.error('Error in fetchNotifications:', error);
      showToast('Failed to load notifications', 'error');
    });

    await populateHospitalDropdown().catch(error => {
      console.error('Error in populateHospitalDropdown:', error);
      showToast('Failed to load hospitals', 'error');
    });
    
  } catch (error) {
    console.error('Error during initialization:', error);
    showToast('Error initializing dashboard', 'error');
  }
});

// Error Handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showToast('An unexpected error occurred. Please try again.', 'error');
});

// Blood Request Form Submission
document.getElementById('submit-request-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoading('submit-request-form');

  try {
    const requestData = {
      blood_type: document.getElementById('request-blood-type').value,
      units_needed: parseInt(document.getElementById('request-units').value),
      urgency_level: document.getElementById('request-urgency').value,
      required_by_date: document.getElementById('request-date').value,
      request_notes: document.getElementById('request-notes').value || '',
      location_latitude: 0.0,  // Default coordinates
      location_longitude: 0.0, // Default coordinates
      // Only include institution_id if it's selected
      ...(document.getElementById('request-hospital')?.value && {
        institution_id: document.getElementById('request-hospital').value
      })
    };

    // Validate required fields
    if (!requestData.blood_type || !requestData.units_needed || !requestData.urgency_level || !requestData.required_by_date) {
      throw new Error('Please fill in all required fields');
    }

    // Validate units needed
    if (requestData.units_needed < 1) {
      throw new Error('Units needed must be at least 1');
    }

    // Validate required by date
    const requiredDate = new Date(requestData.required_by_date);
    const today = new Date();
    if (requiredDate < today) {
      throw new Error('Required by date cannot be in the past');
    }

    const response = await fetch('/api/blood-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit blood request');
    }

    const result = await response.json();
    showToast('Blood request submitted successfully!', 'success');
    
    // Clear form
    document.getElementById('submit-request-form').reset();
    
    // Update UI if needed
    updateRequestsTable(result.request);
    
  } catch (error) {
    console.error('Error submitting blood request:', error);
    showToast(error.message || 'Failed to submit blood request', 'error');
  } finally {
    hideLoading('submit-request-form');
  }
});
