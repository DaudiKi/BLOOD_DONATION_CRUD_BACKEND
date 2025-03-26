// Initialize Socket.IO with authentication
const socket = io({
  auth: { token: localStorage.getItem('token') }
});
const userId = localStorage.getItem('userId');
if (userId) {
  socket.emit('join', userId);
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

// Fetch Institution Data
let institutionData = {};
async function fetchInstitutionData() {
  try {
    const response = await fetch('/api/institutions/me', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    institutionData = await response.json();
    populateOverview();
  } catch (error) {
    console.error('Error fetching institution data:', error);
    showToast('Failed to load institution details.');
  }
}

// Blood Requests
let bloodRequests = [];
async function fetchBloodRequests() {
  try {
    const response = await fetch(`/api/institutions/${userId}/requests`, {
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

// Inventory Data (Mock for now, replace with API call)
const inventoryData = [
  { bloodType: 'A+', units: 10, lastUpdated: '2025-03-24' },
  { bloodType: 'A-', units: 5, lastUpdated: '2025-03-24' },
  { bloodType: 'B+', units: 8, lastUpdated: '2025-03-24' },
  { bloodType: 'B-', units: 3, lastUpdated: '2025-03-24' },
  { bloodType: 'AB+', units: 2, lastUpdated: '2025-03-24' },
  { bloodType: 'AB-', units: 1, lastUpdated: '2025-03-24' },
  { bloodType: 'O+', units: 15, lastUpdated: '2025-03-24' },
  { bloodType: 'O-', units: 7, lastUpdated: '2025-03-24' }
];

// Populate Overview
function populateOverview() {
  document.getElementById('institution-name').textContent = institutionData.name || 'N/A';
  document.getElementById('active-requests').textContent = bloodRequests.filter(r => r.request_status === 'Pending' || r.request_status === 'Matched').length;
  document.getElementById('matched-donors').textContent = bloodRequests.filter(r => r.request_status === 'Matched').length;
  document.getElementById('fulfilled-requests').textContent = bloodRequests.filter(r => r.request_status === 'Fulfilled').length;
}

fetchInstitutionData();
fetchBloodRequests();

// Submit Request Form Submission
document.getElementById('submit-request-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const patientId = document.getElementById('request-patient-id').value || null;
  const bloodType = document.getElementById('request-blood-type').value;
  const unitsNeeded = parseInt(document.getElementById('request-units-needed')?.value) || 1;
  const urgencyLevel = document.getElementById('request-urgency').value;
  const requiredByDate = document.getElementById('request-date').value;
  const locationLatitude = parseFloat(document.getElementById('request-lat').value);
  const locationLongitude = parseFloat(document.getElementById('request-lng').value);

  // Validate latitude and longitude
  if (isNaN(locationLatitude) || locationLatitude < -90 || locationLatitude > 90) {
    showToast('Latitude must be between -90 and 90.');
    return;
  }
  if (isNaN(locationLongitude) || locationLongitude < -180 || locationLongitude > 180) {
    showToast('Longitude must be between -180 and 180.');
    return;
  }

  const newRequest = {
    patient_id: patientId,
    institution_id: userId,
    blood_type: bloodType,
    units_needed: unitsNeeded,
    urgency_level: urgencyLevel,
    request_date: new Date().toISOString(),
    required_by_date: requiredByDate,
    request_notes: `Request for Patient ${patientId || 'N/A'} by ${institutionData.name || 'Unknown'}`,
    location_latitude: locationLatitude,
    location_longitude: locationLongitude
  };

  try {
    const response = await fetch('/api/blood-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(newRequest)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit blood request');
    }

    const result = await response.json();
    bloodRequests.push({
      request_id: result.request.request_id,
      patient_id: patientId,
      blood_type: result.request.blood_type,
      urgency_level: result.request.urgency_level,
      required_by_date: result.request.required_by_date,
      request_status: result.request.request_status,
      matched_donor_id: null
    });
    populateBloodRequests();
    populateOverview();
    showToast('Blood request submitted successfully!', 'success');
    document.getElementById('submit-request-form').reset();
  } catch (error) {
    console.error('Error submitting blood request:', error);
    showToast(error.message || 'Failed to submit blood request.');
  }
});

// Get Current Location using Geolocation API
function getCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        document.getElementById('request-lat').value = position.coords.latitude;
        document.getElementById('request-lng').value = position.coords.longitude;
        showToast('Location retrieved successfully!', 'success');
      },
      (error) => {
        console.error('Error getting location:', error);
        showToast('Unable to retrieve location. Please enter manually.');
      }
    );
  } else {
    showToast('Geolocation is not supported by this browser.');
  }
}

// Populate Blood Requests Table
function populateBloodRequests() {
  const tableBody = document.getElementById('requests-table');
  tableBody.innerHTML = '';
  bloodRequests.forEach(request => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${request.patient_id || 'N/A'}</td>
      <td>${request.blood_type}</td>
      <td>${request.urgency_level}</td>
      <td>${request.required_by_date}</td>
      <td>${request.request_status}</td>
      <td>${request.donor_name || 'Not Matched'}</td>
    `;
    tableBody.appendChild(row);
  });
}

// Populate Inventory Table
function populateInventory() {
  const tableBody = document.getElementById('inventory-table');
  tableBody.innerHTML = '';
  inventoryData.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.bloodType}</td>
      <td>${item.units}</td>
      <td>${item.lastUpdated}</td>
    `;
    tableBody.appendChild(row);
  });
}

populateInventory();

// Listen for Request Actions
socket.on('requestAction', (data) => {
  if (data.institutionId === userId) {
    const request = bloodRequests.find(r => r.request_id === data.requestId);
    if (request) {
      request.request_status = data.action === 'accepted' ? 'Matched' : 'Pending';
      request.matched_donor_id = data.action === 'accepted' ? data.donorId : null;
      populateBloodRequests();
      showToast(data.notification_message, 'success');
    }
  }
});