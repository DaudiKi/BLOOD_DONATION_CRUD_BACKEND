// Global variables
let socket = null;
let isInitialized = false;

// Session Management
function getAuthToken() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
    return null;
  }
  return token;
}

function checkSession() {
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.clear();
      window.location.href = '/';
      return false;
    }

    const userType = localStorage.getItem('userType');
    if (userType !== 'healthcare') {
      localStorage.clear();
      window.location.href = '/';
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error checking session:', e);
    localStorage.clear();
    window.location.href = '/';
    return false;
  }
}

// Handle Logout
function handleLogout() {
  localStorage.clear();
  window.location.href = '/';
}

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

// Toast Notifications
function showToast(message, type = 'error') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.classList.add('toast', type);
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Notifications Panel
function setupNotifications() {
  const notificationsIcon = document.getElementById('notifications-icon');
  const notificationsPanel = document.getElementById('notifications-panel');
  
  if (!notificationsIcon || !notificationsPanel) return;
  
  notificationsIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationsPanel.style.display = notificationsPanel.style.display === 'block' ? 'none' : 'block';
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!notificationsPanel.contains(e.target) && !notificationsIcon.contains(e.target)) {
      notificationsPanel.style.display = 'none';
    }
  });
}

function updateNotifications(notification) {
  const badge = document.getElementById('notification-badge');
  const notificationsList = document.getElementById('notifications-list');
  
  if (!badge || !notificationsList) return;
  
  let count = parseInt(badge.textContent) || 0;
  count++;
  badge.textContent = count;

  const li = document.createElement('li');
  li.textContent = notification.message;
  li.dataset.id = notification.id;
  li.addEventListener('click', () => markNotificationAsRead(notification.id));
  notificationsList.insertBefore(li, notificationsList.firstChild);
}

async function markNotificationAsRead(notificationId) {
  try {
    const token = getAuthToken();
    if (!token) return;

    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Failed to mark notification as read');

    const notification = document.querySelector(`li[data-id="${notificationId}"]`);
    if (notification) {
      notification.classList.add('read');
      
      const badge = document.getElementById('notification-badge');
      if (badge) {
        const count = Math.max(0, parseInt(badge.textContent) - 1);
        badge.textContent = count;
      }
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    showToast('Failed to mark notification as read', 'error');
  }
}

// Fetch Institution Data
async function fetchInstitutionData() {
  showLoading('overview');
  try {
    const token = getAuthToken();
    if (!token) return;

    const response = await fetch('/api/institutions/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        window.location.href = '/';
        return;
      }
      throw new Error('Failed to fetch institution data');
    }

    const data = await response.json();
    populateInstitutionData(data);
    return data;
  } catch (error) {
    console.error('Error fetching institution data:', error);
    showToast('Failed to load institution details', 'error');
  } finally {
    hideLoading('overview');
  }
}

function populateInstitutionData(data) {
  if (!data) return;

  // Update institution name
  document.getElementById('institution-name')?.textContent = data.name || 'Healthcare Institution';

  // Update overview stats
  const elements = {
    'active-requests': data.active_requests || '0',
    'matched-donors': data.matched_donors || '0',
    'fulfilled-requests': data.fulfilled_requests || '0',
    'available-units': data.available_units || '0'
  };

  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  // Update blood inventory
  const bloodTypes = ['a-pos', 'a-neg', 'b-pos', 'b-neg', 'ab-pos', 'ab-neg', 'o-pos', 'o-neg'];
  bloodTypes.forEach(type => {
    const unitsElement = document.getElementById(`${type}-units`);
    const expiryElement = document.getElementById(`${type}-expiry`);
    
    if (unitsElement) {
      unitsElement.textContent = data.inventory?.[type]?.units || '0';
    }
    
    if (expiryElement && data.inventory?.[type]?.expiry_date) {
      const daysUntilExpiry = Math.ceil((new Date(data.inventory[type].expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 7) {
        expiryElement.textContent = `Expires in ${daysUntilExpiry} days`;
      }
    }
  });
}

// Blood Requests
async function fetchBloodRequests() {
  showLoading('track-requests');
  try {
    const token = getAuthToken();
    if (!token) return;

    const response = await fetch('/api/blood-requests', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch blood requests');

    const requests = await response.json();
    populateBloodRequests(requests);
    return requests;
  } catch (error) {
    console.error('Error fetching blood requests:', error);
    showToast('Failed to load blood requests', 'error');
  } finally {
    hideLoading('track-requests');
  }
}

function populateBloodRequests(requests) {
  const requestsTable = document.getElementById('requests-table');
  if (!requestsTable) return;

  requestsTable.innerHTML = '';
  
  requests.forEach(request => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${request.id}</td>
      <td>${request.blood_type}</td>
      <td>${request.units_needed}</td>
      <td><span class="badge badge-${getUrgencyClass(request.urgency)}">${request.urgency}</span></td>
      <td>${new Date(request.required_by).toLocaleDateString()}</td>
      <td><span class="badge badge-${getStatusClass(request.status)}">${request.status}</span></td>
      <td>${request.matched_donors || 0}</td>
      <td>
        <button class="btn btn-outline" onclick="viewRequest('${request.id}')">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    `;
    requestsTable.appendChild(row);
  });
}

// Submit Blood Request
document.getElementById('submit-request-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoading('submit-request');

  try {
    const token = getAuthToken();
    if (!token) return;

    const formData = new FormData(e.target);
    const requestData = {
      blood_type: formData.get('request-blood-type'),
      units_needed: parseInt(formData.get('request-units')),
      urgency: formData.get('request-urgency'),
      required_by: formData.get('request-date'),
      notes: formData.get('request-notes')
    };

    // Validate form data
    if (!requestData.blood_type || !requestData.units_needed || !requestData.urgency || !requestData.required_by) {
      throw new Error('Please fill in all required fields');
    }

    const response = await fetch('/api/blood-requests', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) throw new Error('Failed to submit blood request');

    const result = await response.json();
    showToast('Blood request submitted successfully', 'success');
    e.target.reset();
    await fetchBloodRequests();
  } catch (error) {
    console.error('Error submitting blood request:', error);
    showToast(error.message, 'error');
  } finally {
    hideLoading('submit-request');
  }
});

// Initialize Socket.IO
function initializeSocket() {
  if (socket) {
    socket.disconnect();
  }

  const token = getAuthToken();
  if (!token) return;

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
    showToast('Lost connection to server', 'error');
  });

  socket.on('new_blood_request', (data) => {
    updateBloodRequests(data);
    showToast('New blood request received', 'info');
  });

  socket.on('request_matched', (data) => {
    updateRequestStatus(data);
    showToast('Request matched with donor', 'success');
  });

  socket.on('inventory_update', (data) => {
    updateInventory(data);
    showToast('Blood inventory updated', 'info');
  });
}

// Set up navigation
function setupNavigation() {
  // Handle section navigation
  document.querySelectorAll('#sidebar a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      
      // Update active section
      document.querySelectorAll('section').forEach(section => {
        section.classList.remove('active');
      });
      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.classList.add('active');
      
      // Update active link
      document.querySelectorAll('#sidebar a').forEach(a => {
        a.classList.remove('active');
      });
      link.classList.add('active');

      // Close mobile menu if open
      const sidebar = document.getElementById('sidebar');
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('active');
      }
    });
  });
  
  // Handle mobile menu
  const hamburger = document.querySelector('.hamburger');
  const sidebar = document.getElementById('sidebar');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      sidebar.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
        hamburger.classList.remove('active');
        sidebar.classList.remove('active');
      }
    });
  }
}

// Helper Functions
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

// Initialize everything
async function initialize() {
  if (isInitialized) return;
  
  try {
    if (!checkSession()) return;
    
    // Set up navigation and notifications
    setupNavigation();
    setupNotifications();
    
    // Show the overview section by default
    document.querySelectorAll('section').forEach(section => {
      section.classList.remove('active');
    });
    const overview = document.getElementById('overview');
    if (overview) overview.classList.add('active');
    
    // Initialize all data
    await Promise.all([
      fetchInstitutionData(),
      fetchBloodRequests()
    ]);
    
    initializeSocket();
    
    isInitialized = true;
  } catch (error) {
    console.error('Error during initialization:', error);
    showToast('Error initializing dashboard', 'error');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', initialize);

// Expose necessary functions to window
window.handleLogout = handleLogout;
window.viewRequest = viewRequest;
window.searchDonors = searchDonors;
window.showAddInventory = showAddInventory;
window.showUpdateInventory = showUpdateInventory; 