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
    if (userType !== 'donor') {
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

// Fetch Donor Data
async function fetchDonorData() {
  showLoading('donor-profile');
  try {
    const token = getAuthToken();
    if (!token) return;

    const response = await fetch('/api/donors/me', {
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
      throw new Error('Failed to fetch donor data');
    }

    const donorData = await response.json();
    populateDonorDetails(donorData);
    return donorData;
  } catch (error) {
    console.error('Error fetching donor data:', error);
    showToast('Failed to load donor details', 'error');
  } finally {
    hideLoading('donor-profile');
  }
}

// Populate donor details in the UI
function populateDonorDetails(donorData) {
  if (!donorData) return;

  // Update header and overview section
  const donorName = `${donorData.first_name || ''} ${donorData.last_name || ''}`.trim();
  document.querySelectorAll('#donor-name, #donor-name-header, #view-name').forEach(el => {
    if (el) el.textContent = donorName || 'N/A';
  });
  
  // Update blood type badges
  const bloodType = donorData.blood_type || 'N/A';
  document.querySelectorAll('#blood-type, #blood-type-header, #view-blood-type').forEach(el => {
    if (el) el.textContent = bloodType;
  });
  
  // Update statistics
  const elements = {
    'total-donations': donorData.total_donations || '0',
    'last-donation': donorData.last_donation_date ? new Date(donorData.last_donation_date).toLocaleDateString() : 'No donations yet',
    'donor-status': donorData.is_available ? 'Available' : 'Not Available',
    'view-contact-info': donorData.email || 'N/A',
    'view-phone': donorData.phone_number || 'N/A',
    'view-address': donorData.address || 'N/A',
    'view-city': donorData.city || 'N/A',
    'view-medical-conditions': donorData.medical_conditions || 'None reported'
  };

  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  // Update availability toggle
  const availabilityToggle = document.getElementById('availability-toggle');
  if (availabilityToggle) {
    availabilityToggle.checked = donorData.is_available;
  }

  // Update last availability update timestamp
  const lastUpdate = document.getElementById('last-availability-update');
  if (lastUpdate) {
    lastUpdate.textContent = donorData.availability_updated_at ? 
      new Date(donorData.availability_updated_at).toLocaleString() : 'Not set';
  }
}

// Show edit details form
function showEditDetails() {
  const viewContent = document.getElementById('view-details-content');
  const editForm = document.getElementById('edit-details-form');
  
  if (!viewContent || !editForm) return;
  
  // Populate form with current values
  const elements = {
    'edit-phone': 'view-phone',
    'edit-address': 'view-address',
    'edit-city': 'view-city',
    'edit-medical': 'view-medical-conditions'
  };

  Object.entries(elements).forEach(([editId, viewId]) => {
    const editElement = document.getElementById(editId);
    const viewElement = document.getElementById(viewId);
    if (editElement && viewElement) {
      editElement.value = viewElement.textContent;
    }
  });
  
  viewContent.style.display = 'none';
  editForm.style.display = 'block';
}

// Hide edit details form
function hideEditDetails() {
  const viewContent = document.getElementById('view-details-content');
  const editForm = document.getElementById('edit-details-form');
  
  if (!viewContent || !editForm) return;
  
  viewContent.style.display = 'block';
  editForm.style.display = 'none';
}

// Enhanced form submission with validation
async function updateDonorDetails(event) {
  event.preventDefault();
  showLoading('edit-details-form');

  try {
    const token = getAuthToken();
    const userId = localStorage.getItem('userId');
    if (!token || !userId) throw new Error('Authentication required');
    
    const formData = {
      phone_number: document.getElementById('edit-phone')?.value.trim(),
      address: document.getElementById('edit-address')?.value.trim(),
      city: document.getElementById('edit-city')?.value.trim(),
      medical_conditions: document.getElementById('edit-medical')?.value.trim()
    };

    // Validate form data
    if (!formData.phone_number || !formData.address || !formData.city) {
      throw new Error('Please fill in all required fields');
    }

    // Validate phone number format
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(formData.phone_number)) {
      throw new Error('Please enter a valid phone number');
    }

    const response = await fetch(`/api/donors/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error('Failed to update details');
    }

    const updatedDonor = await response.json();
    populateDonorDetails(updatedDonor);
    hideEditDetails();
    showToast('Details updated successfully', 'success');
  } catch (error) {
    console.error('Error updating donor details:', error);
    showToast(error.message, 'error');
  } finally {
    hideLoading('edit-details-form');
  }
}

// Set up navigation
function setupNavigation() {
  // Handle section navigation
  document.querySelectorAll('aside a').forEach(link => {
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
      document.querySelectorAll('aside a').forEach(a => {
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
      fetchDonorData(),
      fetchNotifications(),
      fetchBloodRequests(),
      fetchDonationHistory()
    ]);
    
    initializeSocket();
    
    isInitialized = true;
  } catch (error) {
    console.error('Error during initialization:', error);
    showToast('Error initializing dashboard', 'error');
  }
}

// Toast Notification
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

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  
  // Edit details form
  const editForm = document.getElementById('edit-details-form');
  if (editForm) {
    editForm.addEventListener('submit', updateDonorDetails);
  }
});

// Expose necessary functions to window
window.showEditDetails = showEditDetails;
window.hideEditDetails = hideEditDetails;
window.handleLogout = handleLogout;
window.updateAvailability = updateAvailability; 