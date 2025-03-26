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

// Fetch Patient Data
let patientData = {};
async function fetchPatientData() {
  try {
    const response = await fetch('/api/patients/me', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    patientData = await response.json();
    populatePatientDetails();
  } catch (error) {
    console.error('Error fetching patient data:', error);
    showToast('Failed to load patient details.');
  }
}

function populatePatientDetails() {
  document.getElementById('patient-name').textContent = patientData.first_name || 'N/A';
  document.getElementById('active-requests').textContent = bloodRequests.length;
  document.getElementById('blood-type').textContent = patientData.blood_type || 'N/A';
  document.getElementById('last-request').textContent = bloodRequests.length > 0 ? bloodRequests[bloodRequests.length - 1].required_by_date : 'N/A';

  documentA.getElementById('view-name').textContent = `${patientData.first_name || ''} ${patientData.last_name || ''}`;
  document.getElementById('view-blood-type').textContent = patientData.blood_type || 'N/A';
  document.getElementById('view-contact-info').textContent = patientData.email || 'N/A';
  document.getElementById('view-phone').textContent = patientData.phone_number || 'N/A';
  document.getElementById('view-address').textContent = patientData.address || 'N/A';
  document.getElementById('view-city').textContent = patientData.city || 'N/A';
  document.getElementById('view-medical-conditions').textContent = patientData.medical_conditions || 'None';
  document.getElementById('view-emergency-contact').textContent = `${patientData.emergency_contact_name || 'N/A'} (${patientData.emergency_contact_phone || 'N/A'})`;
}

fetchPatientData();

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

// Edit Details Form Submission
document.getElementById('edit-details-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const latitude = parseFloat(document.getElementById('edit-lat').value);
  const longitude = parseFloat(document.getElementById('edit-lng').value);

  // Validate latitude and longitude
  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    showToast('Latitude must be between -90 and 90.');
    return;
  }
  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    showToast('Longitude must be between -180 and 180.');
    return;
  }

  const updatedData = {
    first_name: document.getElementById('edit-first-name').value,
    last_name: document.getElementById('edit-last-name').value,
    email: document.getElementById('edit-email').value,
    phone_number: document.getElementById('edit-phone').value,
    date_of_birth: document.getElementById('edit-dob').value,
    blood_type: document.getElementById('edit-blood').value,
    address: document.getElementById('edit-address').value,
    city: document.getElementById('edit-city').value,
    latitude: latitude,
    longitude: longitude,
    medical_conditions: document.getElementById('edit-medical').value,
    emergency_contact_name: document.getElementById('edit-emergency-name').value,
    emergency_contact_phone: document.getElementById('edit-emergency-phone').value
  };

  try {
    const response = await fetch('/api/patients/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updatedData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update details');
    }

    patientData = await response.json();
    populatePatientDetails();
    showToast('Details updated successfully!', 'success');
    cancelEditDetails();
  } catch (error) {
    console.error('Error updating patient details:', error);
    showToast(error.message || 'Failed to update details.');
  }
});

// Blood Requests
let bloodRequests = [];
async function fetchBloodRequests() {
  try {
    const response = await fetch(`/api/patients/${userId}/requests`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    bloodRequests = await response.json();
    populateBloodRequests();
  } catch (error) {
    console.error('Error fetching blood requests:', error);
    showToast('Failed to load blood requests.');
  }
}

document.getElementById('request-blood-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const bloodType = document.getElementById('request-blood-type').value;
  const unitsNeeded = parseInt(document.getElementById('request-units-needed')?.value) || 1;
  const urgencyLevel = document.getElementById('request-urgency').value;
  const requiredByDate = document.getElementById('request-date').value;
  const hospital = document.getElementById('request-hospital').value;
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
    patient_id: userId,
    institution_id: null,
    blood_type: bloodType,
    units_needed: unitsNeeded,
    urgency_level: urgencyLevel,
    request_date: new Date().toISOString(),
    required_by_date: requiredByDate,
    request_notes: `Request from ${patientData.first_name || 'Unknown'} for ${hospital}`,
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
      blood_type: result.request.blood_type,
      hospital: hospital,
      urgency_level: result.request.urgency_level,
      required_by_date: result.request.required_by_date,
      request_status: result.request.request_status,
      matched_donor_id: null
    });
    populateBloodRequests();
    showToast('Blood request submitted successfully!', 'success');
    document.getElementById('request-blood-form').reset();
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

function populateBloodRequests() {
  const tableBody = document.getElementById('requests-table');
  tableBody.innerHTML = '';
  bloodRequests.forEach(request => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${request.blood_type}</td>
      <td>${request.hospital || 'N/A'}</td>
      <td>${request.urgency_level}</td>
      <td>${request.required_by_date}</td>
      <td>${request.request_status}</td>
      <td>${request.donor_name || 'Not Matched'}</td>
    `;
    tableBody.appendChild(row);
  });
  document.getElementById('active-requests').textContent = bloodRequests.length;
  document.getElementById('last-request').textContent = bloodRequests.length > 0 ? bloodRequests[bloodRequests.length - 1].required_by_date : 'N/A';
}

fetchBloodRequests();

// Listen for Request Actions
socket.on('requestAction', (data) => {
  if (data.patientId === userId) {
    const request = bloodRequests.find(r => r.request_id === data.requestId);
    if (request) {
      request.request_status = data.action === 'accepted' ? 'Matched' : 'Pending';
      request.matched_donor_id = data.action === 'accepted' ? data.donorId : null;
      populateBloodRequests();
      showToast(data.notification_message, 'success');
    }
  }
});