/* LifeLink - Interactive JavaScript */

// ========================================
// 0. THEME TOGGLE (Dark/Light Mode)
// ========================================

// Initialize theme on page load
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    updateThemeToggleButton();
  }
}

// Update toggle button emoji based on current theme
function updateThemeToggleButton() {
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    const isDark = document.body.classList.contains('dark-mode');
    toggle.textContent = isDark ? '☀️' : '🌙';
  }
}

// Handle theme toggle
function setupThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      
      // Save preference
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      
      // Update button emoji
      updateThemeToggleButton();
    });
  }
}

// ========================================
// 1. GENERAL UTILITIES
// ========================================

// Toggle mobile menu
function toggleMobileMenu() {
  const nav = document.querySelector('.nav');
  if (nav) {
    nav.classList.toggle('active');
  }
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
  const header = document.querySelector('.header');
  const nav = document.querySelector('.nav');
  const burger = document.querySelector('.burger-menu');
  
  if (nav && nav.classList.contains('active') && 
      !header.contains(event.target)) {
    nav.classList.remove('active');
  }
});

// Modal functions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
});

// Close modal with X button
document.querySelectorAll('.modal-close').forEach(button => {
  button.addEventListener('click', function() {
    this.closest('.modal').classList.remove('active');
    document.body.style.overflow = 'auto';
  });
});

// Alert dismiss
document.querySelectorAll('.alert-close').forEach(button => {
  button.addEventListener('click', function() {
    this.closest('.alert').style.display = 'none';
  });
});

// ========================================
// 2. OTP INPUT HANDLING
// ========================================

function setupOtpInput() {
  const otpInputs = document.querySelectorAll('.otp-input');
  
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', function(e) {
      // Only allow digits
      this.value = this.value.replace(/[^0-9]/g, '');
      
      // Move to next input
      if (this.value.length === 1 && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
    });
    
    input.addEventListener('keydown', function(e) {
      // Handle backspace
      if (e.key === 'Backspace' && this.value === '' && index > 0) {
        otpInputs[index - 1].focus();
      }
    });
  });
}

// ========================================
// 3. FORM VALIDATION
// ========================================

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePhone(phone) {
  const re = /^[0-9+\-\s()]{10,}$/;
  return re.test(phone);
}

function showFormError(input, message) {
  const formGroup = input.closest('.form-group');
  if (formGroup) {
    input.classList.add('is-invalid');
    let errorElement = formGroup.querySelector('.form-error');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'form-error';
      formGroup.appendChild(errorElement);
    }
    errorElement.textContent = message;
  }
}

function clearFormError(input) {
  const formGroup = input.closest('.form-group');
  if (formGroup) {
    input.classList.remove('is-invalid');
    const errorElement = formGroup.querySelector('.form-error');
    if (errorElement) {
      errorElement.remove();
    }
  }
}

// ========================================
// 4. BLOOD DONATION LOGIC
// ========================================

// Check eligibility
function checkDonorEligibility() {
  const age = parseInt(document.getElementById('age')?.value) || 0;
  const weight = parseInt(document.getElementById('weight')?.value) || 0;
  
  let eligible = true;
  let reason = '';
  
  if (age < 18) {
    eligible = false;
    reason = 'Must be at least 18 years old';
  } else if (age > 65) {
    eligible = false;
    reason = 'Must be under 65 years old';
  } else if (weight < 50) {
    eligible = false;
    reason = 'Must weigh at least 50 kg';
  }
  
  const eligibilityStatus = document.getElementById('eligibility-status');
  if (eligibilityStatus) {
    if (eligible) {
      eligibilityStatus.innerHTML = '<span class="badge badge-success">✓ Eligible to Donate</span>';
    } else {
      eligibilityStatus.innerHTML = `<span class="badge badge-warning">${reason}</span>`;
    }
  }
  
  return eligible;
}

// ========================================
// 5. REQUEST FILTERING
// ========================================

function setupRequestFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const requestCards = document.querySelectorAll('.request-card');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      const filter = this.dataset.filter;
      
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      this.classList.add('active');
      
      // Filter requests
      requestCards.forEach(card => {
        if (filter === 'all' || card.classList.contains(filter)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

function setupSearchFilter() {
  const searchInput = document.getElementById('search-requests');
  const requestCards = document.querySelectorAll('.request-card');
  
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase();
      
      requestCards.forEach(card => {
        const hospitalName = card.querySelector('.hospital-name')?.textContent.toLowerCase() || '';
        const location = card.querySelector('.location')?.textContent.toLowerCase() || '';
        const bloodType = card.querySelector('.blood-type')?.textContent.toLowerCase() || '';
        
        if (hospitalName.includes(query) || location.includes(query) || bloodType.includes(query)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
}

// ========================================
// 6. REAL-TIME LOCATION
// ========================================

function getNearbyRequests() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      console.log('Location:', lat, lng);
      
      // In a real app, this would send to the server
      // for database queries based on coordinates
      filterRequestsByDistance(lat, lng);
    }, function(error) {
      console.log('Geolocation error:', error);
      showAlert('Unable to access location. Please enable location services.');
    });
  }
}

function filterRequestsByDistance(lat, lng) {
  const requests = document.querySelectorAll('.request-card');
  
  requests.forEach(request => {
    // Mock calculation - in real app, use actual coordinates
    const proximity = Math.random() * 20; // Mock distance in km
    request.dataset.distance = proximity.toFixed(1);
  });
  
  // Sort by distance
  const container = document.querySelector('.requests-grid');
  if (container) {
    const sorted = Array.from(requests).sort((a, b) => 
      parseFloat(a.dataset.distance) - parseFloat(b.dataset.distance)
    );
    sorted.forEach(request => container.appendChild(request));
  }
}

// ========================================
// 7. NOTIFICATIONS & ALERTS
// ========================================

function showAlert(message, type = 'info') {
  const alertContainer = document.createElement('div');
  alertContainer.className = `alert alert-${type}`;
  alertContainer.innerHTML = `
    <span class="alert-icon">ℹ️</span>
    <div class="alert-content">
      <p>${message}</p>
    </div>
    <button class="alert-close" onclick="this.parentElement.remove()">✕</button>
  `;
  
  const mainContent = document.querySelector('.main-content') || document.querySelector('body');
  mainContent.insertBefore(alertContainer, mainContent.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(() => alertContainer.remove(), 5000);
}

function showSuccessNotification(message) {
  showAlert(message, 'success');
}

function showErrorNotification(message) {
  showAlert(message, 'error');
}

// ========================================
// 8. REQUEST ACTIONS
// ========================================

function acceptRequest(requestId) {
  // Check if user is verified before allowing acceptance
  const indicatorElement = document.getElementById('verification-indicator');
  if (indicatorElement && indicatorElement.textContent !== 'Verified') {
    showAlert('You must complete identity verification before accepting blood requests.', 'warning');
    return;
  }
  
  const modal = document.getElementById('confirmModal');
  if (modal) {
    modal.dataset.requestId = requestId;
    openModal('confirmModal');
  }
}

function confirmAcceptance() {
  const requestId = document.getElementById('confirmModal')?.dataset.requestId;
  if (requestId) {
    closeModal('confirmModal');
    showSuccessNotification('Request accepted! You will be contacted soon with donation details.');
    
    // Simulate API call
    setTimeout(() => {
      const card = document.querySelector(`[data-request-id="${requestId}"]`);
      if (card) {
        const badge = card.querySelector('.request-badge');
        if (badge) {
          badge.textContent = 'Accepted';
          badge.className = 'request-badge badge-success';
        }
      }
    }, 500);
  }
}

// ========================================
// 9. ROLE-BASED FEATURES
// ========================================

function initDashboard(userRole) {
  if (userRole === 'donor') {
    initDonorDashboard();
  } else if (userRole === 'hospital') {
    initHospitalDashboard();
  }
}

function initDonorDashboard() {
  setupRequestFilters();
  setupSearchFilter();
  if (currentUser && currentUser.id && currentUser.qr_token) {
  generateDonorQRCode(currentUser.id, currentUser.qr_token);
}
  // Load dashboard data
  loadDashboardData();
  loadVerificationStatus();
  loadRequests();
  // Generate QR for donor
if (userData.id && userData.qr_token) {
  generateDonorQRCode(userData.id, userData.qr_token);
}
  
  // Enable nearby requests
  const nearbyBtn = document.getElementById('nearby-btn');
  if (nearbyBtn) {
    nearbyBtn.addEventListener('click', getNearbyRequests);
  }
}

function initHospitalDashboard() {
  setupRequestManagement();
  loadHospitalVerificationStatus();
  loadHospitalStats();
  
  // Hospital-specific features
  const postBtn = document.getElementById('post-request-btn');
  if (postBtn) {
    postBtn.addEventListener('click', () => openModal('postRequestModal'));
  }

  // Post request form
  const postRequestForm = document.getElementById('post-request-form');
  if (postRequestForm) {
    postRequestForm.addEventListener('submit', handlePostRequest);
  }
}

// ========================================
// 3.5 DASHBOARD DATA LOADING
// ========================================
let currentUser = null;
async function loadDashboardData() {
  try {
    const response = await fetch('/api/profile', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const userData = await response.json();
      currentUser = userData;
      // Update user name
      const userNameElement = document.getElementById('user-name');
      if (userNameElement) {
        userNameElement.textContent = userData.name || 'Donor';
      }
      
      // Update blood type badge
      const bloodBadge = document.getElementById('blood-group-badge');
      if (bloodBadge) {
        bloodBadge.textContent = userData.blood_type || 'O+';
      }
      
      // Update hero stats
      updateHeroStats(userData);
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function updateHeroStats(userData) {
  // These would come from the API in a real implementation
  const totalDonations = document.getElementById('total-donations');
  const livesImpacted = document.getElementById('lives-impacted');
  const nextDonation = document.getElementById('next-donation');
  
  if (totalDonations) totalDonations.textContent = userData.total_donations || '0';
  if (livesImpacted) livesImpacted.textContent = (userData.total_donations || 0) * 3; // Rough estimate
  if (nextDonation) nextDonation.textContent = '56 days'; // Would calculate from last donation
}

async function loadVerificationStatus() {
  try {
    const response = await fetch('/api/profile', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const userData = await response.json();
      const statusElement = document.getElementById('verification-status');
      const indicatorElement = document.getElementById('verification-indicator');
      
      if (statusElement && indicatorElement) {
        if (userData.kyc_verified) {
          statusElement.innerHTML = `
            <div class="verification-success">
              <span class="icon">✅</span>
              <div>
                <strong>Verified Donor</strong>
                <p>Your identity has been verified. You can accept blood requests.</p>
              </div>
            </div>
          `;
          indicatorElement.textContent = 'Verified';
          indicatorElement.style.backgroundColor = 'var(--color-light-green)';
          indicatorElement.style.color = 'var(--color-white)';
        } else if (userData.kyc_pending) {
          statusElement.innerHTML = `
            <div class="verification-pending">
              <span class="icon">⏳</span>
              <div>
                <strong>Verification Pending</strong>
                <p>Your documents are being reviewed. This usually takes 24-48 hours.</p>
                <a href="#" onclick="openKycPage()">View Submission</a>
              </div>
            </div>
          `;
          indicatorElement.textContent = 'Pending';
          indicatorElement.style.backgroundColor = 'var(--color-warning)';
          indicatorElement.style.color = 'var(--color-white)';
        } else {
          statusElement.innerHTML = `
            <div class="verification-required">
              <span class="icon">⚠️</span>
              <div>
                <strong>Verification Required</strong>
                <p>Complete your identity verification to start donating blood.</p>
                <a href="/kyc-verification" onclick="openKycPage()">Start Verification</a>
              </div>
            </div>
          `;
          indicatorElement.textContent = 'Required';
          indicatorElement.style.backgroundColor = 'var(--color-error)';
          indicatorElement.style.color = 'var(--color-white)';
        }
      }
    }
  } catch (error) {
    console.error('Error loading verification status:', error);
  }
}

async function loadRequests() {
  try {
    const response = await fetch('/api/requests', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const requests = await response.json();
      displayRequests(requests);
    }
  } catch (error) {
    console.error('Error loading requests:', error);
    // Fallback to mock data
    displayMockRequests();
  }
}

function displayRequests(requests) {
  const urgentContainer = document.getElementById('urgent-requests-container');
  const allContainer = document.getElementById('all-requests-container');
  
  if (!urgentContainer || !allContainer) return;
  
  // Clear existing content
  urgentContainer.innerHTML = '';
  allContainer.innerHTML = '';
  
  // Separate urgent and routine requests
  const urgentRequests = requests.filter(r => r.urgency === 'critical' || r.urgency === 'urgent');
  const allRequests = requests;
  
  // Display urgent requests
  if (urgentRequests.length > 0) {
    urgentRequests.forEach(request => {
      urgentContainer.appendChild(createRequestCard(request));
    });
  } else {
    urgentContainer.innerHTML = '<p class="no-requests">No urgent requests at this time.</p>';
  }
  
  // Display all requests
  allRequests.forEach(request => {
    allContainer.appendChild(createRequestCard(request));
  });
}

function createRequestCard(request) {
  const card = document.createElement('div');
  card.className = `request-card ${request.urgency}`;
  card.innerHTML = `
    <div class="request-header">
      <div class="blood-type-badge">${request.blood_type}</div>
      <span class="urgency-badge badge-${request.urgency}">${request.urgency.toUpperCase()}</span>
    </div>
    <div class="request-body">
      <h4 class="hospital-name">${request.hospital_name}</h4>
      <p class="location">📍 ${request.location} • ${request.distance || '2.5'} km away</p>
      <p class="units">${request.units_needed} units needed</p>
    </div>
    <div class="request-actions">
      <button class="btn btn-primary" onclick="acceptRequest(${request.id})">Accept Request</button>
    </div>
  `;
  return card;
}

function displayMockRequests() {
  const mockRequests = [
    {
      id: 1,
      blood_type: 'O-',
      urgency: 'critical',
      hospital_name: 'Central Hospital',
      location: 'Yaoundé Center',
      distance: '2.3',
      units_needed: 3
    },
    {
      id: 2,
      blood_type: 'A+',
      urgency: 'urgent',
      hospital_name: 'Red Cross Clinic',
      location: 'Yaoundé West',
      distance: '3.5',
      units_needed: 2
    },
    {
      id: 3,
      blood_type: 'B+',
      urgency: 'routine',
      hospital_name: 'St. Luke Hospital',
      location: 'Bamenda',
      distance: '0.8',
      units_needed: 1
    }
  ];
  
  displayRequests(mockRequests);
}

function openWallet() {
  window.location.href = 'wallet.html';
}

function openQRScanner() {
  // For now, just show an alert. In real implementation, open camera
  showAlert('QR Scanner would open here. Scan at hospital for check-in.', 'info');
}
function openQRScanner() {
  const modal = document.getElementById('qrScannerModal');
  if (modal) {
    openModal('qrScannerModal');
    startQRScanner();
  } else {
    showAlert('QR Scanner not available', 'error');
  }
}

function openKycPage() {
  window.location.href = 'hospital-kyc.html';
}

// ========================================
// 3.6 HOSPITAL DASHBOARD FUNCTIONS
// ========================================

async function loadHospitalVerificationStatus() {
  try {
    const response = await fetch('/api/profile', {
      credentials: 'include'
    });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (response.redirected || response.url.includes('/login')) {
        window.location.href = '/hospital-login';
      }
      return;
    }

    if (response.ok) {
      const hospitalData = await response.json();
      const statusElement = document.getElementById('verification-content');
      const indicatorElement = document.getElementById('verification-indicator');
      
      if (statusElement && indicatorElement) {
        if (hospitalData.verification_status === 'verified') {
          statusElement.innerHTML = `
            <div class="verification-success">
              <span class="icon">✅</span>
              <div>
                <strong>Hospital Verified</strong>
                <p>You can now post blood requests and access donor information.</p>
              </div>
            </div>
          `;
          indicatorElement.textContent = 'Verified';
          indicatorElement.style.backgroundColor = 'var(--color-light-green)';
          indicatorElement.style.color = 'var(--color-white)';
        } else if (hospitalData.verification_status === 'pending') {
          statusElement.innerHTML = `
            <div class="verification-pending">
              <span class="icon">⏳</span>
              <div>
                <strong>Verification Pending</strong>
                <p>Your documents are being reviewed. This usually takes 24-48 hours.</p>
                <a href="#" onclick="openKycPage()">View Submission</a>
              </div>
            </div>
          `;
          indicatorElement.textContent = 'Pending';
          indicatorElement.style.backgroundColor = 'var(--color-warning)';
          indicatorElement.style.color = 'var(--color-white)';
        } else if (hospitalData.verification_status === 'rejected') {
          statusElement.innerHTML = `
            <div class="verification-required">
              <span class="icon">❌</span>
              <div>
                <strong>Verification Rejected</strong>
                <p>Please contact support for assistance with your verification.</p>
                <a href="#" onclick="openKycPage()">Resubmit Documents</a>
              </div>
            </div>
          `;
          indicatorElement.textContent = 'Rejected';
          indicatorElement.style.backgroundColor = 'var(--color-error)';
          indicatorElement.style.color = 'var(--color-white)';
        } else {
          statusElement.innerHTML = `
            <div class="verification-required">
              <span class="icon">⚠️</span>
              <div>
                <strong>Verification Required</strong>
                <p>Complete your hospital verification to start posting blood requests.</p>
                <a href="/kyc-verification" onclick="openKycPage()">Start Verification</a>
              </div>
            </div>
          `;
          indicatorElement.textContent = 'Required';
          indicatorElement.style.backgroundColor = 'var(--color-error)';
          indicatorElement.style.color = 'var(--color-white)';
        }
      }
    }
  } catch (error) {
    console.error('Error loading verification status:', error);
  }
}

async function loadHospitalStats() {
  try {
    // Load hospital-specific stats
    const response = await fetch('/api/hospital/stats', {
      credentials: 'include'
    });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (response.redirected || response.url.includes('/login')) {
        window.location.href = '/hospital-login';
      }
      return;
    }

    if (response.ok) {
      const stats = await response.json();
      updateHospitalStats(stats);
    }
  } catch (error) {
    console.error('Error loading hospital stats:', error);
    // Use mock data
    updateHospitalStats({
      activeRequests: 12,
      fulfilledThisWeek: 8,
      verifiedDonors: 247,
      avgResponseTime: '2.4 hrs'
    });
  }
}

function updateHospitalStats(stats) {
  const activeRequests = document.querySelector('.stat-value');
  const fulfilled = document.querySelectorAll('.stat-value')[1];
  const donors = document.querySelectorAll('.stat-value')[2];
  const responseTime = document.querySelectorAll('.stat-value')[3];
  
  if (activeRequests) activeRequests.textContent = stats.activeRequests || '0';
  if (fulfilled) fulfilled.textContent = stats.fulfilledThisWeek || '0';
  if (donors) donors.textContent = stats.verifiedDonors || '0';
  if (responseTime) responseTime.textContent = stats.avgResponseTime || 'N/A';
}

async function handlePostRequest(e) {
  e.preventDefault();
  
  // Check if hospital is verified
  const indicatorElement = document.getElementById('verification-indicator');
  if (indicatorElement && indicatorElement.textContent !== 'Verified') {
    showAlert('You must complete hospital verification before posting requests.', 'warning');
    return;
  }
  
  const formData = new FormData(e.target);
  const requestData = {
    bloodType: formData.get('blood-type'),
    unitsNeeded: parseInt(formData.get('units-needed')),
    urgencyLevel: formData.get('urgency'),
    location: formData.get('hospital-location'),
    notes: formData.get('case-description')
  };
  
  try {
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(requestData)
    });
    
    if (response.ok) {
      showSuccessNotification('Blood request posted successfully!');
      closeModal('postRequestModal');
      e.target.reset();
      loadHospitalStats(); // Refresh stats
    } else {
      throw new Error('Failed to post request');
    }
  } catch (error) {
    console.error('Error posting request:', error);
    showErrorNotification('Failed to post request. Please try again.');
  }
}

function submitPostRequest() {
  const form = document.getElementById('post-request-form');
  if (form) {
    form.dispatchEvent(new Event('submit'));
  }
}

// ========================================
// 3.7 HOSPITAL KYC FUNCTIONS
// ========================================

async function handleHospitalKyc(e) {
  e.preventDefault();
  console.log('🏥 Hospital KYC form submitted');
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const alertDiv = document.getElementById('hospital-kyc-alert') || createHospitalKycAlert(form);
  
  // Validate checkboxes
  const accuracyConfirmation = document.getElementById('accuracy-confirmation');
  const complianceAgreement = document.getElementById('compliance-agreement');
  
  if (!accuracyConfirmation?.checked) {
    console.warn('⚠️ Accuracy confirmation not checked');
    showHospitalKycAlert(alertDiv, '❌ Please confirm the accuracy of information', 'error');
    return;
  }
  
  if (!complianceAgreement?.checked) {
    console.warn('⚠️ Compliance agreement not checked');
    showHospitalKycAlert(alertDiv, '❌ Please agree to compliance standards', 'error');
    return;
  }
  
  // Get file inputs and validate
  const licenseDoc = document.getElementById('license-document');
  const registrationCert = document.getElementById('registration-certificate');
  
  if (!licenseDoc?.files?.length) {
    console.warn('⚠️ License document not selected');
    showHospitalKycAlert(alertDiv, '❌ Please upload your medical license document', 'error');
    return;
  }
  
  if (!registrationCert?.files?.length) {
    console.warn('⚠️ Registration certificate not selected');
    showHospitalKycAlert(alertDiv, '❌ Please upload your registration certificate', 'error');
    return;
  }
  
  // Validate file sizes (max 5MB each)
  const maxFileSize = 5 * 1024 * 1024;
  if (licenseDoc.files[0].size > maxFileSize) {
    console.warn('⚠️ License document too large');
    showHospitalKycAlert(alertDiv, '❌ License document exceeds 5MB limit', 'error');
    return;
  }
  
  if (registrationCert.files[0].size > maxFileSize) {
    console.warn('⚠️ Registration certificate too large');
    showHospitalKycAlert(alertDiv, '❌ Registration certificate exceeds 5MB limit', 'error');
    return;
  }
  
  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Submitting...';
    }
    
    // Create FormData with all fields including files
    const formData = new FormData();
    
    // Text fields
    formData.append('licenseNumber', document.getElementById('license-number')?.value || '');
    formData.append('registrationNumber', document.getElementById('registration-number')?.value || '');
    formData.append('registrationDate', document.getElementById('registration-date')?.value || '');
    formData.append('issuingAuthority', document.getElementById('issuing-authority')?.value || '');
    formData.append('hospitalAddress', document.getElementById('hospital-address')?.value || '');
    formData.append('contactPerson', document.getElementById('contact-person')?.value || '');
    
    // File fields
    formData.append('licenseDocument', licenseDoc.files[0]);
    formData.append('registrationCertificate', registrationCert.files[0]);
    
    // Optional blood bank certification
    const bloodBankCert = document.getElementById('blood-bank-certification');
    if (bloodBankCert?.files?.length) {
      if (bloodBankCert.files[0].size <= maxFileSize) {
        formData.append('bloodBankCertification', bloodBankCert.files[0]);
      }
    }
    
    console.log('📝 Form data prepared:', {
      licenseNumber: formData.get('licenseNumber'),
      registrationNumber: formData.get('registrationNumber'),
      hasLicenseDoc: !!formData.get('licenseDocument'),
      hasRegCert: !!formData.get('registrationCertificate'),
      hasBloodBankCert: !!formData.get('bloodBankCertification')
    });
    
    console.log('🚀 Sending hospital KYC to /api/hospital/kyc/submit');

    const response = await fetch('/api/hospital/kyc/submit', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    
    console.log('📨 Response received:', { status: response.status, ok: response.ok });
    
    const result = await response.json();
    console.log('📦 Response data:', result);
    
    if (response.ok && result.success) {
      console.log('✅ Hospital KYC submitted successfully!');
      showHospitalKycAlert(alertDiv, '✅ ' + (result.message || 'KYC documents submitted successfully! Your verification will be reviewed within 24-48 hours.'), 'success');
      
      setTimeout(() => {
        window.location.href = 'hospital-dashboard.html';
      }, 2000);
    } else {
      console.warn('❌ Submission failed:', result.message);
      showHospitalKycAlert(alertDiv, '❌ ' + (result.message || 'Failed to submit documents'), 'error');
    }
  } catch (error) {
    console.error('💥 Error submitting hospital KYC:', error);
    showHospitalKycAlert(alertDiv, '❌ ' + (error.message || 'Failed to submit documents. Please try again.'), 'error');
    showErrorNotification('Failed to submit documents. Please try again.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit for Verification';
    }
  }
}

// Helper function to create alert div if missing
function createHospitalKycAlert(form) {
  const alertDiv = document.createElement('div');
  alertDiv.id = 'hospital-kyc-alert';
  alertDiv.style.display = 'none';
  alertDiv.style.padding = '12px';
  alertDiv.style.marginBottom = '16px';
  alertDiv.style.borderRadius = '4px';
  alertDiv.style.border = '1px solid';
  alertDiv.style.fontWeight = '500';
  form.parentElement.insertBefore(alertDiv, form);
  return alertDiv;
}

// Helper function to show hospital KYC alert
function showHospitalKycAlert(alertDiv, message, type) {
  if (!alertDiv) return;
  
  alertDiv.textContent = message;
  alertDiv.style.display = 'block';
  
  if (type === 'error') {
    alertDiv.style.backgroundColor = '#fee';
    alertDiv.style.borderColor = '#fcc';
    alertDiv.style.color = '#c00';
  } else if (type === 'success') {
    alertDiv.style.backgroundColor = '#efe';
    alertDiv.style.borderColor = '#cfc';
    alertDiv.style.color = '#080';
  } else {
    alertDiv.style.backgroundColor = '#eef';
    alertDiv.style.borderColor = '#ccf';
    alertDiv.style.color = '#008';
  }
}

function setupRequestManagement() {
  const requestItems = document.querySelectorAll('.request-item');
  
  requestItems.forEach(item => {
    const viewBtn = item.querySelector('.view-btn');
    const editBtn = item.querySelector('.edit-btn');
    const deleteBtn = item.querySelector('.delete-btn');
    
    if (viewBtn) {
      viewBtn.addEventListener('click', function() {
        showRequestDetails(this.dataset.requestId);
      });
    }
    
    if (editBtn) {
      editBtn.addEventListener('click', function() {
        editRequest(this.dataset.requestId);
      });
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this request?')) {
          deleteRequest(this.dataset.requestId);
        }
      });
    }
  });
}

function showRequestDetails(requestId) {
  openModal('requestDetailsModal');
  // Load request data via API in real app
}

function editRequest(requestId) {
  openModal('editRequestModal');
  // Load request data via API in real app
}

function deleteRequest(requestId) {
  showSuccessNotification('Request deleted successfully');
  // API call in real app
}

// ========================================
// 10. FORM SUBMISSION
// ========================================

function setupFormHandlers() {
  console.log('🔧 Setting up form handlers...');
  
  // Donor signup form
  const donorSignupForm = document.getElementById('donor-signup-form');
  if (donorSignupForm) {
    donorSignupForm.addEventListener('submit', handleDonorSignup);
    console.log('✅ Donor signup form handler attached');
  }
  
  // Hospital signup form
  const hospitalSignupForm = document.getElementById('hospital-signup-form');
  if (hospitalSignupForm) {
    hospitalSignupForm.addEventListener('submit', handleHospitalSignup);
    console.log('✅ Hospital signup form handler attached');
  }
  
  // Donor login form
  const donorLoginForm = document.getElementById('donor-login-form');
  if (donorLoginForm) {
    donorLoginForm.addEventListener('submit', handleDonorLogin);
    console.log('✅ Donor login form handler attached');
  }
  
  // Hospital login form
  const hospitalLoginForm = document.getElementById('hospital-login-form');
  if (hospitalLoginForm) {
    hospitalLoginForm.addEventListener('submit', handleHospitalLogin);
    console.log('✅ Hospital login form handler attached');
  } else {
    console.warn('⚠️ Hospital login form NOT found in DOM');
  }
  
  // Verification form
  const verificationForm = document.getElementById('verification-form');
  if (verificationForm) {
    verificationForm.addEventListener('submit', handleVerification);
    console.log('✅ Verification form handler attached');
  }
  
  // Hospital KYC form
  const hospitalKycForm = document.getElementById('hospital-kyc-form');
  if (hospitalKycForm) {
    hospitalKycForm.addEventListener('submit', handleHospitalKyc);
    console.log('✅ Hospital KYC form handler attached');
  }
  
  // OTP verification form
  const otpForm = document.getElementById('otp-form');
  if (otpForm) {
    otpForm.addEventListener('submit', handleOtpVerification);
    console.log('✅ OTP form handler attached');
  }
  
  // Post blood request form
  const requestForm = document.getElementById('post-request-form');
  if (requestForm) {
    requestForm.addEventListener('submit', handlePostRequest);
    console.log('✅ Post request form handler attached');
  }
  
  // Profile form
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileUpdate);
    console.log('✅ Profile form handler attached');
  }
}

function handleDonorSignup(e) {
  e.preventDefault();
  
  const fullName = document.getElementById('full_name')?.value;
  const userName = document.getElementById('user_name')?.value;
  const email = document.getElementById('email')?.value;
  const phone = document.getElementById('phone')?.value;
  const password = document.getElementById('password')?.value;
  const bloodGroup = document.getElementById('blood-group')?.value;
  const location = document.getElementById('location')?.value;
  
  // Validation
  let isValid = true;
  
  if (!fullName) {
    showFormError(document.getElementById('full_name'), 'Name is required');
    isValid = false;
  }
  if (!userName) {
    showFormError(document.getElementById('username'), 'Username is required');
    isValid = false;
  }
  
  if (!validateEmail(email)) {
    showFormError(document.getElementById('email'), 'Valid email is required');
    isValid = false;
  }
  
  if (!validatePhone(phone)) {
    showFormError(document.getElementById('phone'), 'Valid phone number is required');
    isValid = false;
  }
  
  if (!password || password.length < 8) {
    showFormError(document.getElementById('password'), 'Password must be at least 8 characters');
    isValid = false;
  }
  
  if (!bloodGroup) {
    showFormError(document.getElementById('blood-group'), 'Blood group is required');
    isValid = false;
  }
  
  if (!location) {
    showFormError(document.getElementById('location'), 'location is required');
    isValid = false;
  }
  
  if (!isValid) return;
  
  // Send to server
  registerDonor({ full_name: fullName,userName, email, phone, password, bloodGroup, location });
}

async function registerDonor(donorData) {
  try {
    const response = await fetch('/api/register/donor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(donorData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showSuccessNotification(result.message);
      setTimeout(() => {
        window.location.href = '/verification';
      }, 2000);
    } else {
      showErrorNotification(result.message || 'Registration failed');
    }
  } catch (error) {
    console.error('Error registering donor:', error);
    showErrorNotification('Registration failed. Please try again.');
  }
}

async function handleHospitalSignup(e) {
  e.preventDefault();
  
  const formData = {
    hospitalName: document.getElementById('hospital-name')?.value,
    location: document.getElementById('location')?.value, // Note: using location as location
    email: document.getElementById('email')?.value,
    phone: document.getElementById('phone')?.value,
    password: document.getElementById('password')?.value,
    registrationNumber: document.getElementById('registration-number')?.value,
    licenseNumber: document.getElementById('license-number')?.value,
    licenseYear: '2024', // Default
    hospitalAddress: document.getElementById('address')?.value,
    bloodBankManager: document.getElementById('contact-person')?.value,
    managerPhone: document.getElementById('phone')?.value, // Same as hospital phone
    hospitalType: 'General' // Default
  };
  
  // Basic validation
  let isValid = true;
  
  if (!formData.hospitalName) {
    showFormError(document.getElementById('hospital-name'), 'Hospital name is required');
    isValid = false;
  }
  
  if (!formData.email || !validateEmail(formData.email)) {
    showFormError(document.getElementById('email'), 'Valid email is required');
    isValid = false;
  }
  
  if (!formData.phone) {
    showFormError(document.getElementById('phone'), 'Phone number is required');
    isValid = false;
  }
  
  if (!formData.password || formData.password.length < 8) {
    showFormError(document.getElementById('password'), 'Password must be at least 8 characters');
    isValid = false;
  }
  
  if (!isValid) return;
  
  try {
    const response = await fetch('/api/register/hospital', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showSuccessNotification(result.message);
      setTimeout(() => {
        window.location.href = '/verification';
      }, 2000);
    } else {
      showErrorNotification(result.message || 'Registration failed');
    }
  } catch (error) {
    console.error('Error registering hospital:', error);
    showErrorNotification('Registration failed. Please try again.');
  }
}

async function handleDonorLogin(e) {
  e.preventDefault();
  
  const identifier = (document.getElementById('login-identifier')?.value || '').trim();
  const password = document.getElementById('password')?.value;
  const submitBtn = e.target.querySelector('button[type="submit"]');
  
  if (!identifier || !password) {
    showErrorNotification('Please fill in all fields');
    return;
  }
  
  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';
    }

    const response = await fetch('/api/login/donor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ identifier, password })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      showSuccessNotification('Login successful');
      setTimeout(() => {
        window.location.href = result.redirect || '/donor-dashboard';
      }, 1000);
    } else {
      showErrorNotification(result.message || 'Login failed');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    showErrorNotification('Login failed. Please try again.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  }
}

async function handleHospitalLogin(e) {
  e.preventDefault();
  console.log('🔵 Hospital login form submitted');
  
  const identifier = (document.getElementById('login-identifier')?.value || '').trim();
  const password = document.getElementById('hospital-password')?.value;
  const submitBtn = document.getElementById('hospital-login-btn') || e.target.querySelector('button[type="submit"]');
  const alertDiv = document.getElementById('login-alert');
  
  console.log('📝 Form data:', { identifier, passwordLength: password?.length });
  
  if (!identifier || !password) {
    console.warn('⚠️ Missing fields: identifier or password');
    const msg = 'Please fill in all fields';
    if (alertDiv) {
      alertDiv.textContent = '❌ ' + msg;
      alertDiv.style.display = 'block';
      alertDiv.style.backgroundColor = '#fee';
      alertDiv.style.borderColor = '#fcc';
      alertDiv.style.color = '#c00';
    }
    showErrorNotification(msg);
    return;
  }
  
  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';
    }
    
    console.log('🚀 Sending login request to /api/login/hospital');

    const response = await fetch('/api/login/hospital', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ identifier, password })
    });
    
    console.log('📨 Response received:', { status: response.status, ok: response.ok });
    
    const result = await response.json();
    console.log('📦 Response data:', result);
    
    if (response.ok && result.success) {
      console.log('✅ Login successful!');
      const msg = 'Login successful';
      if (alertDiv) {
        alertDiv.textContent = '✅ ' + msg;
        alertDiv.style.display = 'block';
        alertDiv.style.backgroundColor = '#efe';
        alertDiv.style.borderColor = '#cfc';
        alertDiv.style.color = '#080';
      }
      showSuccessNotification(msg);
      
      const redirectUrl = result.redirect || '/hospital-dashboard';
      console.log('🔄 Redirecting to:', redirectUrl);
      
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
    } else {
      console.warn('❌ Login failed:', result.message);
      const msg = result.message || 'Login failed';
      if (alertDiv) {
        alertDiv.textContent = '❌ ' + msg;
        alertDiv.style.display = 'block';
        alertDiv.style.backgroundColor = '#fee';
        alertDiv.style.borderColor = '#fcc';
        alertDiv.style.color = '#c00';
      }
      showErrorNotification(msg);
    }
  } catch (error) {
    console.error('💥 Error logging in:', error);
    const msg = 'Login failed. Please try again.';
    if (alertDiv) {
      alertDiv.textContent = '❌ ' + msg;
      alertDiv.style.display = 'block';
      alertDiv.style.backgroundColor = '#fee';
      alertDiv.style.borderColor = '#fcc';
      alertDiv.style.color = '#c00';
    }
    showErrorNotification(msg);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  }
}

async function handleVerification(e) {
  e.preventDefault();
  
  const otpInputs = document.querySelectorAll('.otp-input');
  const code = Array.from(otpInputs).map(input => input.value).join('');
  
  if (code.length !== 6) {
    showErrorNotification('Please enter all 6 digits');
    return;
  }
  
  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showSuccessNotification('Account verified successfully!');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else {
      showErrorNotification(result.message || 'Verification failed');
    }
  } catch (error) {
    console.error('Error verifying:', error);
    showErrorNotification('Verification failed. Please try again.');
  }
}

function handleOtpVerification(e) {
  e.preventDefault();
  
  const otpInputs = document.querySelectorAll('.otp-input');
  const otp = Array.from(otpInputs).map(input => input.value).join('');
  
  if (otp.length !== 6) {
    showAlert('Please enter all 6 digits', 'error');
    return;
  }
  
  showSuccessNotification('Phone number verified successfully');
  // Redirect to dashboard in real app
}

function handlePostRequestLegacy(e) {
  e.preventDefault();
  
  const bloodType = document.getElementById('blood-type')?.value;
  const urgency = document.getElementById('urgency')?.value;
  const unitsNeeded = document.getElementById('units-needed')?.value;
  const location = document.getElementById('hospital-location')?.value;
  
  if (!bloodType || !urgency || !unitsNeeded || !location) {
    showAlert('All fields are required', 'error');
    return;
  }
  
  showSuccessNotification('Blood request posted successfully');
  closeModal('postRequestModal');
  
  // Add to list in real app
}

function handleProfileUpdate(e) {
  e.preventDefault();
  showSuccessNotification('Profile updated successfully');
}

// ========================================
// 11. SIDEBAR TOGGLE
// ========================================

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('mobile-active');
  }
}

// ========================================
// 12. INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('=====================================');
  console.log('✨ LifeLink Script Loaded');
  console.log('=====================================');
  
  // Initialize theme
  initializeTheme();
  setupThemeToggle();
  
  // Setup burger menu
  const burgerMenu = document.querySelector('.burger-menu');
  if (burgerMenu) {
    burgerMenu.addEventListener('click', toggleMobileMenu);
  }
  
  // Setup form handlers
  setupFormHandlers();
  
  // Setup OTP input
  setupOtpInput();
  
  // Initialize dashboard if present
  const userRole = document.body.dataset.userRole;
  if (userRole) {
    initDashboard(userRole);
  }
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href !== '#' && document.querySelector(href)) {
        e.preventDefault();
        document.querySelector(href).scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  
  console.log('✅ LifeLink UI initialized successfully');
  console.log('=====================================');
});

// ========================================
// 13. UTILITY: FORMAT FUNCTIONS
// ========================================

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getUrgencyColor(urgency) {
  switch(urgency) {
    case 'critical': return 'critical';
    case 'urgent': return 'urgent';
    default: return 'routine';
  }
}

function getUrgencyEmoji(urgency) {
  switch(urgency) {
    case 'critical': return '🚨';
    case 'urgent': return '⚠️';
    default: return 'ℹ️';
  }
}


// ========================================
// 14. QR CODE GENERATION (DONOR SIDE)
// ========================================

function generateDonorQRCode(donorId, token) {
  const qrContainer = document.getElementById('donor-qrcode');
  if (!qrContainer) return;

  qrContainer.innerHTML = '';

  const qrData = JSON.stringify({
    donor_id: donorId,
    token: token
  });

  if (typeof QRCode !== 'undefined') {
    new QRCode(qrContainer, {
      text: qrData,
      width: 200,
      height: 200
    });
  } else {
    console.warn('QRCode library not loaded');
  }
}

// ========================================
// 15. QR CODE SCANNER (HOSPITAL)
// ========================================

let qrScanner = null;

function startQRScanner() {
  const reader = document.getElementById('qr-reader');
  if (!reader) return;

  if (typeof Html5Qrcode === 'undefined') {
    showErrorNotification('QR Scanner library not loaded');
    return;
  }

  qrScanner = new Html5Qrcode("qr-reader");

  qrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    onScanSuccess
  ).catch(err => {
    console.error(err);
    showErrorNotification('Camera access failed');
  });
}

function stopQRScanner() {
  if (qrScanner) {
    qrScanner.stop()
      .then(() => qrScanner.clear())
      .catch(err => console.error(err));
  }
}

function onScanSuccess(decodedText) {
  console.log("Scanned QR:", decodedText);

  stopQRScanner();
  closeModal('qrScannerModal');

  try {
    const data = JSON.parse(decodedText);
    verifyDonorQR(data);
  } catch (e) {
    showErrorNotification('Invalid QR Code');
  }
}
// ========================================
// OTP AUTHENTICATION SYSTEM
// ========================================

let otpResendTimer = null;
let currentPhone = null;
let currentRole = null;

// Initialize signup forms
function initializeSignupForms() {
  const donorForm = document.getElementById('donor-signup-form');
  const hospitalForm = document.getElementById('hospital-signup-form');
  
  if (donorForm) {
    donorForm.addEventListener('submit', handleDonorSignup);
  }
  
  if (hospitalForm) {
    hospitalForm.addEventListener('submit', handleHospitalSignup);
  }

  // Initialize OTP verification form
  const otpForm = document.getElementById('otp-verification-form');
  if (otpForm) {
    otpForm.addEventListener('submit', handleOtpVerification);
    setupOtpInputs();
  }
}

// Get form data from signup form
function getSignupFormData(form) {
  const formData = new FormData(form);
  const data = {};
  
  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }
  
  return data;
}

// Handle Donor Signup
async function handleDonorSignup(e) {
  e.preventDefault();
  
  const form = e.target;
  const alertDiv = document.getElementById('auth-alert');
  const submitBtn = document.getElementById('signup-submit-btn');
  
  try {
    // Get form data manually (FormData might not work with custom IDs)
    const userData = {
      name: document.getElementById('full_name').value,
      email: document.getElementById('email').value || 'donor@example.com',
      phone: document.getElementById('phone').value,
      password: document.getElementById('password').value,
      location: document.getElementById('location').value
    };

    // Validation
    if (!userData.name || !userData.phone || !userData.password) {
      showAuthAlert(alertDiv, '❌ Please fill in all required fields', 'error');
      return;
    }

    if (userData.password.length < 6) {
      showAuthAlert(alertDiv, '❌ Password must be at least 6 characters', 'error');
      return;
    }

    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Sending OTP...';

    // Call backend
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        role: 'donor',
        location: userData.location
      })
    });

    const data = await response.json();

    if (data.success) {
      currentPhone = userData.phone;
      currentRole = 'donor';
      
      showAuthAlert(alertDiv, `✅ ${data.message}`, 'success');
      
      // Hide signup form, show OTP section
      setTimeout(() => {
        form.style.display = 'none';
        document.getElementById('otp-section').style.display = 'block';
        document.getElementById('otp-phone-display').textContent = userData.phone;
        
        // Start resend timer
        startResendTimer();
      }, 1500);
    } else {
      showAuthAlert(alertDiv, `❌ ${data.message}`, 'error');
    }
  } catch (error) {
    showAuthAlert(alertDiv, `❌ Error: ${error.message}`, 'error');
    console.error('Signup error:', error);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
}

// Handle Hospital Signup
async function handleHospitalSignup(e) {
  e.preventDefault();
  
  const form = e.target;
  const alertDiv = document.getElementById('auth-alert');
  const submitBtn = document.getElementById('signup-submit-btn');
  
  try {
    const userData = {
      name: document.getElementById('hospital-name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      password: document.getElementById('password').value,
      location: document.getElementById('city').value
    };

    // Validation
    if (!userData.name || !userData.phone || !userData.password) {
      showAuthAlert(alertDiv, '❌ Please fill in all required fields', 'error');
      return;
    }

    if (userData.password.length < 6) {
      showAuthAlert(alertDiv, '❌ Password must be at least 6 characters', 'error');
      return;
    }

    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Sending OTP...';

    // Call backend
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        role: 'hospital',
        location: userData.location
      })
    });

    const data = await response.json();

    if (data.success) {
      currentPhone = userData.phone;
      currentRole = 'hospital';
      
      showAuthAlert(alertDiv, `✅ ${data.message}`, 'success');
      
      // Hide signup form, show OTP section
      setTimeout(() => {
        form.style.display = 'none';
        document.getElementById('otp-section').style.display = 'block';
        document.getElementById('otp-phone-display').textContent = userData.phone;
        
        // Start resend timer
        startResendTimer();
      }, 1500);
    } else {
      showAuthAlert(alertDiv, `❌ ${data.message}`, 'error');
    }
  } catch (error) {
    showAuthAlert(alertDiv, `❌ Error: ${error.message}`, 'error');
    console.error('Signup error:', error);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Register Hospital';
  }
}

// Setup OTP input fields (auto-advance on input)
function setupOtpInputs() {
  const otpInputs = document.querySelectorAll('.otp-input');
  
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      // Only allow numbers
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      
      // Move to next input
      if (e.target.value && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
    });
    
    input.addEventListener('keydown', (e) => {
      // Handle backspace
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        otpInputs[index - 1].focus();
      }
    });
  });
}

// Get OTP from inputs
function getOtpFromInputs() {
  const otpInputs = document.querySelectorAll('.otp-input');
  return Array.from(otpInputs).map(input => input.value).join('');
}

// Handle OTP Verification
async function handleOtpVerification(e) {
  e.preventDefault();
  
  const alertDiv = document.getElementById('auth-alert');
  const submitBtn = document.getElementById('verify-submit-btn');
  const otp = getOtpFromInputs();
  
  try {
    if (!otp || otp.length !== 6) {
      showAuthAlert(alertDiv, '❌ Please enter a valid 6-digit code', 'error');
      return;
    }

    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Verifying...';

    // Call backend
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        phone: currentPhone,
        otp: otp
      })
    });

    const data = await response.json();

    if (data.success) {
      showAuthAlert(alertDiv, `✅ ${data.message}`, 'success');
      
      console.log('✅ Registration successful!', data);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        const role = data.role || currentRole;
        const redirectPath = data.redirect || (role === 'hospital' ? '/hospital-dashboard' : '/donor-dashboard');
        window.location.href = redirectPath;
      }, 2000);
    } else {
      showAuthAlert(alertDiv, `❌ ${data.message}`, 'error');
      
      // Show attempts left if available
      if (data.attemptsLeft !== undefined) {
        const msg = `⚠️ ${data.attemptsLeft} attempt${data.attemptsLeft === 1 ? '' : 's'} remaining`;
        showAuthAlert(alertDiv, msg, 'warning');
      }
    }
  } catch (error) {
    showAuthAlert(alertDiv, `❌ Verification error: ${error.message}`, 'error');
    console.error('OTP verification error:', error);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Verify & Complete Registration';
  }
}

// Start resend OTP timer
function startResendTimer() {
  let seconds = 60;
  const timerEl = document.getElementById('resend-timer');
  const resendLink = document.getElementById('resend-link');
  
  if (!timerEl) return;
  
  resendLink.style.opacity = '0.5';
  resendLink.style.pointerEvents = 'none';
  
  otpResendTimer = setInterval(() => {
    seconds--;
    timerEl.textContent = seconds;
    
    if (seconds <= 0) {
      clearInterval(otpResendTimer);
      timerEl.textContent = '60';
      resendLink.style.opacity = '1';
      resendLink.style.pointerEvents = 'auto';
    }
  }, 1000);
}

// Handle Resend OTP
async function handleResendOtp(e) {
  e.preventDefault();
  
  const alertDiv = document.getElementById('auth-alert');
  const resendLink = document.getElementById('resend-link');
  
  if (resendLink.style.pointerEvents === 'none') {
    return; // Timer still active
  }
  
  try {
    const response = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone: currentPhone })
    });

    const data = await response.json();

    if (data.success) {
      showAuthAlert(alertDiv, '✅ OTP resent successfully!', 'success');
      startResendTimer();
    } else {
      showAuthAlert(alertDiv, `❌ ${data.message}`, 'error');
    }
  } catch (error) {
    showAuthAlert(alertDiv, `❌ Resend error: ${error.message}`, 'error');
  }
}

// Show alert message
function showAuthAlert(alertDiv, message, type) {
  if (!alertDiv) return;
  
  alertDiv.textContent = message;
  alertDiv.className = `alert alert-${type}`;
  alertDiv.style.display = 'block';
  
  // Auto-hide after 5 seconds for success
  if (type === 'success') {
    setTimeout(() => {
      alertDiv.style.display = 'none';
    }, 5000);
  }
}

// ============================================
// KYC VERIFICATION SYSTEM
// ============================================

/**
 * Start KYC verification flow
 * Called when user tries to accept request without KYC
 */
function startKYCVerification() {
  const phone = localStorage.getItem('userPhone');
  
  if (!phone) {
    console.error('User phone not found');
    window.location.href = '/donor-signup';
    return;
  }

  // Store the phone in localStorage for kyc-form.html
  localStorage.setItem('userPhone', phone);
  
  // Redirect to KYC form
  window.location.href = '/pages/kyc-form.html';
}

/**
 * Check if user has completed KYC verification
 * Returns { verified: boolean, pending: boolean, status: string }
 */
async function checkKYCStatus(phone) {
  try {
    const response = await fetch(`/api/kyc/status/${phone}`);
    const data = await response.json();
    
    return {
      verified: data.verified,
      pending: data.pending,
      status: data.status,
      bloodGroup: data.bloodGroup,
      rejectionReason: data.rejectionReason
    };
  } catch (error) {
    console.error('Error checking KYC status:', error);
    return {
      verified: false,
      pending: false,
      status: 'error'
    };
  }
}

/**
 * Get user profile including KYC status
 */
async function getUserProfile(phone) {
  try {
    const response = await fetch(`/api/profile?phone=${phone}`);
    const data = await response.json();
    
    if (data.success) {
      return {
        kycStatus: data.kyc_status,
        kycSubmitted: data.kyc_submitted,
        kycVerified: data.kyc_verified,
        kycPending: data.kyc_pending,
        bloodGroup: data.blood_group
      };
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
  }
  
  return null;
}

/**
 * Display KYC status on dashboard
 */
async function displayKYCStatus() {
  const phone = localStorage.getItem('userPhone');
  
  if (!phone) return;

  try {
    const status = await checkKYCStatus(phone);
    const statusElement = document.getElementById('kyc-status-alert');
    
    if (!statusElement) return;

    if (status.verified) {
      statusElement.innerHTML = `
        <div class="alert alert-success">
          <strong>✓ You are verified!</strong> You can now accept blood donation requests.
        </div>
      `;
      statusElement.style.display = 'block';
    } else if (status.pending) {
      statusElement.innerHTML = `
        <div class="alert alert-warning">
          <strong>⏳ Verification in progress</strong> Your documents are under review. Check back soon!
        </div>
      `;
      statusElement.style.display = 'block';
    } else if (status.status === 'rejected') {
      statusElement.innerHTML = `
        <div class="alert alert-error">
          <strong>✕ Verification failed</strong> ${status.rejectionReason || 'Please resubmit with clearer documents'}
          <button onclick="startKYCVerification()" style="margin-top: 10px; padding: 6px 12px; background: #b91c1c; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Resubmit KYC
          </button>
        </div>
      `;
      statusElement.style.display = 'block';
    } else {
      statusElement.innerHTML = `
        <div class="alert alert-info">
          <strong>📋 Complete your profile</strong> Submit your KYC verification to start accepting requests
          <button onclick="startKYCVerification()" style="margin-top: 10px; padding: 6px 12px; background: #0284c7; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Start Verification
          </button>
        </div>
      `;
      statusElement.style.display = 'block';
    }
  } catch (error) {
    console.error('Error displaying KYC status:', error);
  }
}

/**
 * Block access to request acceptance if KYC not verified
 * Returns true if user can accept, false otherwise
 */
async function canAcceptRequests(phone) {
  try {
    const status = await checkKYCStatus(phone);
    return status.verified === true;
  } catch (error) {
    console.error('Error checking request acceptance rights:', error);
    return false;
  }
}

// ============================================
// ADMIN KYC MANAGEMENT (for admin dashboard)
// ============================================

/**
 * Fetch all pending KYC requests (admin only)
 */
async function getPendingKYCRequests() {
  try {
    const response = await fetch('/api/kyc/requests');
    const data = await response.json();
    
    if (data.success) {
      return data.requests;
    }
  } catch (error) {
    console.error('Error fetching pending KYC requests:', error);
  }
  
  return [];
}

/**
 * Approve KYC for a user (admin only)
 */
async function approveKYC(phone) {
  try {
    const response = await fetch('/api/kyc/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showSuccessNotification(`✓ KYC approved for ${phone}`);
      return true;
    } else {
      showErrorNotification(data.message || 'Failed to approve KYC');
      return false;
    }
  } catch (error) {
    console.error('Error approving KYC:', error);
    showErrorNotification('Error approving KYC');
    return false;
  }
}

/**
 * Reject KYC for a user (admin only)
 */

// ============================================
// TRANSACTIONAL QR VERIFICATION SYSTEM
// ============================================

/**
 * Check wallet balance for current donor
 * Returns the current balance or 0 if not available
 */
async function getWalletBalance() {
  try {
    const response = await fetch('/api/wallet/balance');
    const data = await response.json();
    
    if (data.success) {
      return data.balance || 0;
    }
  } catch (error) {
    console.error('❌ Error getting wallet balance:', error);
  }
  
  return 0;
}

/**
 * Check if wallet is locked (balance = 0)
 * Adds visual overlay to disable donation features
 */
async function checkWalletLock() {
  console.log('🔒 Checking wallet lock status...');
  const balance = await getWalletBalance();
  const walletStatus = document.getElementById('wallet-balance');
  
  if (walletStatus) {
    walletStatus.textContent = `Balance: ${balance} points`;
  }
  
  // If balance is 0, apply overlay
  if (balance === 0) {
    console.log('🔒 Wallet is locked (balance = 0)');
    applyWalletLock();
  } else {
    console.log('✅ Wallet is unlocked (balance = ' + balance + ')');
    removeWalletLock();
  }
}

/**
 * Apply visual lock to wallet - disable donation features
 */
function applyWalletLock() {
  // Check if overlay already exists
  let overlay = document.getElementById('wallet-lock-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'wallet-lock-overlay';
    overlay.className = 'wallet-overlay active';
    overlay.innerHTML = `
      <div class="wallet-lock-message">
        <div class="lock-icon">🔒</div>
        <h3>Wallet Locked</h3>
        <p>Donate blood to unlock wallet features</p>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    overlay.classList.add('active');
  }
  
  // Apply blur to donation-related elements
  const donationElements = document.querySelectorAll('[data-donation], .donation-area, .request-details');
  donationElements.forEach(el => {
    el.classList.add('wallet-locked');
  });
}

/**
 * Remove wallet lock overlay - enable donation features
 */
function removeWalletLock() {
  const overlay = document.getElementById('wallet-lock-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
  
  // Remove blur from donation elements
  const donationElements = document.querySelectorAll('[data-donation], .donation-area, .request-details');
  donationElements.forEach(el => {
    el.classList.remove('wallet-locked');
  });
}

/**
 * Initiate a donation transaction
 * Creates a transaction and generates QR code for hospital scanning
 * 
 * @param {number} amount - Amount to donate (blood points)
 * @param {number} hospitalId - Hospital ID receiving the donation
 * @returns {boolean} - Success status
 */
async function initiateTransaction(amount, hospitalId) {
  console.log('💳 Initiating transaction:', { amount, hospitalId });
  
  try {
    // Validate inputs
    if (!amount || amount <= 0) {
      showErrorNotification('Invalid donation amount');
      return false;
    }
    
    if (!hospitalId) {
      showErrorNotification('Hospital not specified');
      return false;
    }
    
    // Check wallet status first
    const balance = await getWalletBalance();
    if (balance === 0) {
      showErrorNotification('🔒 Wallet is locked. Please donate blood first.');
      return false;
    }
    
    // Create transaction on backend
    const response = await fetch('/api/create-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount,
        hospital_id: hospitalId,
        metadata: {
          initiated_at: new Date().toISOString()
        }
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      showErrorNotification(data.message || 'Failed to create transaction');
      return false;
    }
    
    console.log('✅ Transaction created:', data);
    
    // Generate QR code with the token
    generateQRCode(data.token, data.amount);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error initiating transaction:', error);
    showErrorNotification('Error creating transaction');
    return false;
  }
}

/**
 * Generate QR code for transaction verification
 * Display in modal for hospital to scan
 * 
 * @param {string} token - 32-character transaction token
 * @param {number} amount - Donation amount
 */
function generateQRCode(token, amount) {
  console.log('📲 Generating QR code for token:', token.substring(0, 8) + '...');
  
  // Create modal for QR display
  let modal = document.getElementById('qr-modal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'qr-modal';
    modal.className = 'qr-modal';
    document.body.appendChild(modal);
  }
  
  // Get base URL for QR (current server)
  const baseUrl = window.location.origin; // e.g., http://localhost:8500
  const verifyUrl = `${baseUrl}/api/verify/${token}`;
  
  // Clear previous QR
  const qrContainer = modal.querySelector('.qr-container') || createQRContainer(modal);
  qrContainer.innerHTML = '';
  
  // Generate QR using QRCode.js library
  // First, load the library if not already loaded
  if (typeof QRCode === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = () => {
      generateQRWithLibrary(qrContainer, verifyUrl, token, amount);
    };
    document.head.appendChild(script);
  } else {
    generateQRWithLibrary(qrContainer, verifyUrl, token, amount);
  }
  
  // Show modal
  modal.classList.add('active');
}

/**
 * Generate QR code using QRCode.js library
 */
function generateQRWithLibrary(container, url, token, amount) {
  console.log('🎨 Rendering QR code canvas');
  
  // Clear container
  container.innerHTML = '';
  
  // Create QR code
  new QRCode(container, {
    text: url,
    width: 200,
    height: 200,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
  
  // Add transaction details below QR
  const details = document.createElement('div');
  details.className = 'qr-details';
  details.innerHTML = `
    <p><strong>Amount:</strong> ${amount} points</p>
    <p><strong>Status:</strong> Waiting for hospital to scan...</p>
    <p style="font-size: 12px; color: #999;">Token: ${token.substring(0, 8)}...</p>
  `;
  
  container.appendChild(details);
  
  // Setup polling to check verification status
  pollTransactionStatus(token);
}

/**
 * Create QR modal container structure
 */
function createQRContainer(modal) {
  modal.innerHTML = `
    <div class="qr-modal-content">
      <button class="qr-close" onclick="document.getElementById('qr-modal').classList.remove('active')">✕</button>
      <h2>Scan to Verify Donation</h2>
      <div class="qr-container"></div>
      <p class="qr-instructions">Ask the hospital staff to scan this QR code to verify your donation</p>
    </div>
  `;
  return modal.querySelector('.qr-container');
}

/**
 * Poll transaction status until verified or timeout
 * @param {string} token - Transaction token
 */
function pollTransactionStatus(token) {
  console.log('🔄 Starting transaction status poll for:', token.substring(0, 8) + '...');
  
  let pollCount = 0;
  const maxPolls = 120; // 2 minutes with 1-second intervals
  
  const pollInterval = setInterval(async () => {
    pollCount++;
    
    try {
      const response = await fetch(`/api/transaction/${token}`);
      const data = await response.json();
      
      if (data.success && data.status === 'completed') {
        console.log('✅ Transaction verified!');
        clearInterval(pollInterval);
        
        // Close QR modal
        const modal = document.getElementById('qr-modal');
        if (modal) {
          modal.classList.remove('active');
        }
        
        // Refresh wallet balance
        setTimeout(() => {
          checkWalletLock();
        }, 1000);
        
        // Show success notification
        showSuccessNotification('✅ Donation verified! Wallet updated.');
      }
    } catch (error) {
      console.error('Error polling transaction status:', error);
    }
    
    // Timeout after 2 minutes
    if (pollCount >= maxPolls) {
      clearInterval(pollInterval);
      console.warn('⏰ Transaction verification timeout');
    }
  }, 1000); // Poll every 1 second
}

/**
 * Close QR modal
 */
function closeQRModal() {
  const modal = document.getElementById('qr-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// ============================================
// EMAIL OTP AUTHENTICATION SYSTEM
// ============================================

/**
 * Email OTP - Request OTP to be sent to email
 * @param {string} email - User email address
 * @returns {Promise<boolean>} Success status
 */
async function sendEmailOTP(email) {
  console.log('📧 Requesting OTP for email:', email);
  
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn('⚠️ Invalid email format:', email);
      showErrorNotification('Please enter a valid email address');
      return false;
    }

    // Show loading state
    const sendBtn = document.getElementById('send-otp-btn');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';
    }

    // Call API
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase() })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ OTP sent successfully to:', email);
      showSuccessNotification('OTP sent to your email address. Check your inbox!');
      
      // Show OTP input field
      const otpInput = document.getElementById('otp-input');
      if (otpInput) {
        otpInput.style.display = 'block';
        otpInput.focus();
      }
      
      // Start timer for resend button
      startResendTimer();
      
      return true;
    } else {
      console.error('❌ Failed to send OTP:', data.message);
      showErrorNotification(data.message || 'Failed to send OTP. Please try again.');
      return false;
    }

  } catch (error) {
    console.error('💥 Error sending OTP:', error);
    showErrorNotification('An error occurred. Please try again.');
    return false;
  } finally {
    // Reset button state
    const sendBtn = document.getElementById('send-otp-btn');
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send OTP';
    }
  }
}

/**
 * Email OTP - Verify OTP code
 * @param {string} email - User email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<boolean>} Verification success
 */
async function verifyEmailOTP(email, otp) {
  console.log('🔍 Verifying OTP for:', email);
  
  try {
    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp.trim())) {
      console.warn('⚠️ Invalid OTP format. Expected 6 digits.');
      showErrorNotification('OTP must be 6 digits');
      return false;
    }

    // Show loading state
    const verifyBtn = document.getElementById('verify-otp-btn');
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying...';
    }

    // Call API
    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.toLowerCase(),
        otp: otp.trim()
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ OTP verified successfully');
      showSuccessNotification('Email verified successfully!');
      
      // Store verified email in session/local storage
      sessionStorage.setItem('verifiedEmail', email.toLowerCase());
      
      return true;
    } else {
      console.warn('❌ OTP verification failed:', data.message);
      showErrorNotification(data.message || 'Invalid OTP. Please try again.');
      return false;
    }

  } catch (error) {
    console.error('💥 Error verifying OTP:', error);
    showErrorNotification('An error occurred. Please try again.');
    return false;
  } finally {
    // Reset button state
    const verifyBtn = document.getElementById('verify-otp-btn');
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify OTP';
    }
  }
}

/**
 * Email OTP - Resend OTP to email
 * @param {string} email - User email address
 * @returns {Promise<boolean>} Success status
 */
async function resendEmailOTP(email) {
  console.log('🔄 Resending OTP for:', email);
  
  try {
    const response = await fetch('/api/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase() })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ OTP resent successfully');
      showSuccessNotification('OTP resent to your email address!');
      startResendTimer(); // Reset timer
      return true;
    } else {
      console.error('❌ Failed to resend OTP:', data.message);
      showErrorNotification(data.message || 'Failed to resend OTP.');
      return false;
    }

  } catch (error) {
    console.error('💥 Error resending OTP:', error);
    showErrorNotification('An error occurred. Please try again.');
    return false;
  }
}

/**
 * Start countdown timer for resend OTP button
 * Disables resend for 60 seconds
 */
function startResendTimer() {
  const resendBtn = document.getElementById('resend-otp-btn');
  if (!resendBtn) return;

  resendBtn.disabled = true;
  let secondsLeft = 60;

  const timerInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      resendBtn.disabled = false;
      resendBtn.textContent = 'Resend OTP';
    } else {
      resendBtn.textContent = `Resend OTP (${secondsLeft}s)`;
    }
  }, 1000);
}

/**
 * Check if email has been verified (in session)
 * @returns {boolean} Verification status
 */
function isEmailVerified() {
  return !!sessionStorage.getItem('verifiedEmail');
}

/**
 * Get verified email from session
 * @returns {string|null} Email address or null
 */
function getVerifiedEmail() {
  return sessionStorage.getItem('verifiedEmail');
}

/**
 * Clear email verification from session
 */
function clearEmailVerification() {
  sessionStorage.removeItem('verifiedEmail');
  console.log('🧹 Email verification cleared');
}

async function rejectKYC(phone, reason = '') {
  try {
    const response = await fetch('/api/kyc/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, reason })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showSuccessNotification(`✓ KYC rejected for ${phone}`);
      return true;
    } else {
      showErrorNotification(data.message || 'Failed to reject KYC');
      return false;
    }
  } catch (error) {
    console.error('Error rejecting KYC:', error);
    showErrorNotification('Error rejecting KYC');
    return false;
  }
}

/**
 * Load and display pending KYC requests in admin dashboard
 */
async function loadPendingKYCRequests() {
  const container = document.getElementById('pending-kyc-container');
  if (!container) return;

  try {
    const requests = await getPendingKYCRequests();
    
    if (requests.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #6b7280;">No pending KYC requests</p>';
      return;
    }

    container.innerHTML = requests.map(req => `
      <div class="kyc-request-card" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <h4 style="margin: 0 0 8px 0;">Phone: *${req.phoneFullForAdmin.slice(-4)}</h4>
            <p style="margin: 4px 0;">Blood Group: <strong>${req.bloodGroup}</strong></p>
            <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">Submitted: ${new Date(req.submittedAt).toLocaleDateString()}</p>
            ${req.idCardPath ? `<p style="margin: 8px 0;"><a href="/uploads/${req.idCardFilename}" target="_blank" style="color: #c62828;">View Document</a></p>` : ''}
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="approveKYC('${req.phoneFullForAdmin}')" class="btn btn-primary" style="padding: 8px 12px; font-size: 12px;">Approve</button>
            <button onclick="rejectKYC('${req.phoneFullForAdmin}', 'Documents did not meet requirements')" class="btn btn-secondary" style="padding: 8px 12px; font-size: 12px;">Reject</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading KYC requests:', error);
    container.innerHTML = '<p style="text-align: center; color: #b91c1c;">Error loading requests</p>';
  }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  setupThemeToggle();
  initializeSignupForms();
  displayKYCStatus();
});


// ==============================
// GET ALL PENDING KYC REQUESTS
// ==============================
app.get('/api/kyc/requests', async (req, res) => {
  try {
    const users = await User.find({ kyc_status: 'pending' });

    const requests = users.map(user => ({
      phone: user.phone,
      bloodGroup: user.bloodGroup,
      submittedAt: user.createdAt,
      idCardPath: user.idCardPath
    }));

    res.json({ success: true, requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// ==============================
// APPROVE KYC
// ==============================
app.post('/api/kyc/approve', async (req, res) => {
  try {
    const { phone } = req.body;

    await User.findOneAndUpdate(
      { phone },
      {
        kyc_status: 'verified',
        kyc_verified: true,
        kyc_pending: false
      }
    );

    res.json({ success: true, message: 'KYC approved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});


// ==============================
// REJECT KYC
// ==============================
app.post('/api/kyc/reject', async (req, res) => {
  try {
    const { phone, reason } = req.body;

    await User.findOneAndUpdate(
      { phone },
      {
        kyc_status: 'rejected',
        kyc_verified: false,
        kyc_pending: false,
        rejectionReason: reason || 'Invalid documents'
      }
    );

    res.json({ success: true, message: 'KYC rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

// ========================================
// 16. VERIFY DONOR QR
// ========================================

async function verifyDonorQR(data) {
  try {
    const response = await fetch('/api/verify-donor-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      showSuccessNotification(`Donor Verified: ${result.name}`);

      // OPTIONAL: update UI
      showAlert(`Blood Group: ${result.bloodGroup}`, 'success');

    } else {
      showErrorNotification(result.message || 'Verification failed');
    }

  } catch (error) {
    console.error(error);
    showErrorNotification('Server error');
  }
}