// Initialize Socket.IO with authentication
const socket = io({
  auth: { token: localStorage.getItem('token') }
});
const userId = localStorage.getItem('userId');
if (userId) {
  socket.emit('join', userId);
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

// Fetch Donor Data
let donorData = {};
async function fetchDonorData() {
  try {
    const response = await fetch('/api/donors/me', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    donorData = await response.json();
    populateDonorDetails();
  } catch (error) {
    console.error('Error fetching donor data:', error);
    showToast('Failed to load donor details.');
  }
}

function populateDonorDetails() {
  document.getElementById('donor-name').textContent = donorData.first_name || 'N/A';
  document.getElementById('total-donations').textContent = donorData.total_donations || '0';
  document.getElementById('last-donation').textContent = donorData.last_donation_date || 'N/A';
  document.getElementById('blood-type').textContent = donorData.blood_type || 'N/A';

  document.getElementById('view-name').textContent = `${donorData.first_name || ''} ${donorData.last_name || ''}`;
  document.getElementById('view-blood-type').textContent = donorData.blood_type || 'N/A';
  document.getElementById('view-contact-info').textContent = donorData.email || 'N/A';
  document.getElementById('view-phone').textContent = donorData.phone_number || 'N/A';
  document.getElementById('view-address').textContent = donorData.address || 'N/A';
  document.getElementById('view-city').textContent = donorData.city || 'N/A';
  document.getElementById('view-last-donation').textContent = donorData.last_donation_date || 'N/A';
  document.getElementById('view-availability').textContent = donorData.is_available ? 'Yes' : 'No';
  document.getElementById('view-medical-conditions').textContent = donorData.medical_conditions || 'None';
}

fetchDonorData();

// Show/Hide Edit Details Form
function showEditDetails() {
  document.getElementById('view-details').style.display = 'none';
  const editSection = document.getElementById('edit-details');
  editSection.style.display = 'block';

  document.getElementById('edit-first-name').value = donorData.first_name || '';
  document.getElementById('edit-last-name').value = donorData.last_name || '';
  document.getElementById('edit-email').value = donorData.email || '';
  document.getElementById('edit-phone').value = donorData.phone_number || '';
  document.getElementById('edit-dob').value = donorData.date_of_birth || '';
  document.getElementById('edit-blood').value = donorData.blood_type || '';
  document.getElementById('edit-weight').value = donorData.weight || '';
  document.getElementById('edit-address').value = donorData.address || '';
  document.getElementById('edit-city').value = donorData.city || '';
  document.getElementById('edit-lat').value = donorData.latitude || '';
  document.getElementById('edit-lng').value = donorData.longitude || '';
  document.getElementById('edit-last-donation').value = donorData.last_donation_date || '';
  document.getElementById('edit-available').value = donorData.is_available.toString();
  document.getElementById('edit-medical').value = donorData.medical_conditions || '';
}

function cancelEditDetails() {
  document.getElementById('edit-details').style.display = 'none';
  document.getElementById('view-details').style.display = 'block';
}

// Edit Details Form Submission
document.getElementById('edit-details-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const updatedData = {
    first_name: document.getElementById('edit-first-name').value,
    last_name: document.getElementById('edit-last-name').value,
    email: document.getElementById('edit-email').value,
    phone_number: document.getElementById('edit-phone').value,
    date_of_birth: document.getElementById('edit-dob').value,
    blood_type: document.getElementById('edit-blood').value,
    weight: document.getElementById('edit-weight').value,
    address: document.getElementById('edit-address').value,
    city: document.getElementById('edit-city').value,
    latitude: document.getElementById('edit-lat').value,
    longitude: document.getElementById('edit-lng').value,
    last_donation_date: document.getElementById('edit-last-donation').value,
    is_available: document.getElementById('edit-available').value === 'true',
    medical_conditions: document.getElementById('edit-medical').value
  };

  try {
    const response = await fetch('/api/donors/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updatedData)
    });
    donorData = await response.json();
    populateDonorDetails();
    showToast('Details updated successfully!');
    cancelEditDetails();
  } catch (error) {
    console.error('Error updating donor details:', error);
    showToast('Failed to update details.');
  }
});

// Availability Confirmation
function confirmAvailability() {
  const isAvailable = document.getElementById('availability-toggle').checked;
  document.getElementById('availability-status').textContent = isAvailable ? 'Available' : 'Not Available';
  donorData.is_available = isAvailable;
  document.getElementById('view-availability').textContent = isAvailable ? 'Yes' : 'No';

  // Update availability on the server
  fetch('/api/donors/me/availability', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ is_available: isAvailable })
  })
    .then(() => {
      showToast('Availability status updated!');
    })
    .catch(error => {
      console.error('Error updating availability:', error);
      showToast('Failed to update availability.');
    });
}

// Blood Requests
let bloodRequests = [];

function populateBloodRequests() {
  const tableBody = document.getElementById('blood-requests-table');
  tableBody.innerHTML = '';
  bloodRequests.forEach(request => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${request.institution_name || 'Unknown'}</td>
      <td>${request.blood_type}</td>
      <td>${request.urgency_level}</td>
      <td>
        <button class="btn" onclick="acceptBloodRequest(${request.request_id})">Accept</button>
        <button class="btn secondary-btn" onclick="rejectBloodRequest(${request.request_id})">Reject</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

async function acceptBloodRequest(requestId) {
  const request = bloodRequests.find(r => r.request_id === requestId);
  if (request) {
    try {
      const response = await fetch(`/api/blood-requests/${requestId}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ donorId: userId })
      });
      const result = await response.json();
      showToast(`Blood request accepted!`);
      const index = bloodRequests.findIndex(r => r.request_id === requestId);
      bloodRequests.splice(index, 1);
      populateBloodRequests();
    } catch (error) {
      console.error('Error accepting request:', error);
      showToast('Failed to accept blood request.');
    }
  }
}

async function rejectBloodRequest(requestId) {
  const request = bloodRequests.find(r => r.request_id === requestId);
  if (request) {
    try {
      const response = await fetch(`/api/blood-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      showToast(`Blood request rejected.`);
      const index = bloodRequests.findIndex(r => r.request_id === requestId);
      bloodRequests.splice(index, 1);
      populateBloodRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      showToast('Failed to reject blood request.');
    }
  }
}

socket.on('bloodRequest', (data) => {
  if (donorData.blood_type === data.bloodType && donorData.is_available) {
    bloodRequests.push({
      request_id: data.requestId,
      blood_type: data.bloodType,
      urgency_level: data.urgency,
      patient_id: data.patientId,
      institution_id: data.institutionId
    });
    populateBloodRequests();
    showToast(data.notification_message);
  }
});