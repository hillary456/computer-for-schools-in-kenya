const API_URL = "http://localhost:3000/api";

let currentUser = null;
let authToken = null;
let isLoginMode = true;
let selectedUserType = 'donor';

document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    checkSession();
});

function initializeApp() {
    setupEventListeners();
    setupSmoothScrolling();
    setupMobileMenu();
    setupFormValidation();
    animateOnScroll();
    // Initialize auth modal state
    const authModal = document.getElementById('authModal');
    if (authModal && authModal.style.display !== 'none') {
        switchTab('login');
    }
}

function checkSession() {
    const storedUser = sessionStorage.getItem('currentUser');
    const storedToken = sessionStorage.getItem('authToken');

    if (storedUser && storedToken) {
        currentUser = JSON.parse(storedUser);
        authToken = storedToken;
        // If user is logged in, show dashboard button or update UI if needed
        const loginBtn = document.querySelector('.login-btn');
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-user"></i> Dashboard';
            loginBtn.onclick = openDashboard;
        }
    }
}

function getAuthHeaders() {
    // 1. Always get the fresh token from storage
    const token = localStorage.getItem('token') || authToken; 
    
    const headers = { 
        'Content-Type': 'application/json' 
    };

    // 2. Only add header if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

function setupEventListeners() {
    document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', handleNavClick));

    const donationForm = document.getElementById('donationForm');
    if (donationForm) donationForm.addEventListener('submit', handleDonationSubmit);

    const dashDonationForm = document.getElementById('dashboardDonationForm');
    if (dashDonationForm) dashDonationForm.addEventListener('submit', handleDonationSubmit);

    const contactForm = document.getElementById('contactForm');
    if (contactForm) contactForm.addEventListener('submit', handleContactSubmit);

    const authForm = document.getElementById('authForm');
    if (authForm) authForm.addEventListener('submit', handleAuthSubmit);

    const requestForm = document.getElementById('requestForm');
    if (requestForm) requestForm.addEventListener('submit', handleRequestSubmit);

    const fulfillmentForm = document.getElementById('fulfillmentForm');
    if (fulfillmentForm) {
        fulfillmentForm.addEventListener('submit', handleFulfillmentSubmit);
    }

    document.querySelectorAll('.user-type-btn').forEach(btn => btn.addEventListener('click', handleUserTypeSelect));
    window.addEventListener('click', handleModalClick);
}

function handleNavClick(e) {
    e.preventDefault();
    const targetId = e.target.getAttribute('href').substring(1);
    scrollToSection(targetId);
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        const headerHeight = document.querySelector('.header').offsetHeight;
        const elementPosition = element.offsetTop - headerHeight - 20;
        window.scrollTo({ top: elementPosition, behavior: 'smooth' });
    }
}

function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            scrollToSection(targetId);
        });
    });
}

function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }
}

function setupFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('input', function (e) {
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
                clearFieldError(e);
            }
        });
        form.addEventListener('focusout', function (e) {
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
                if (e.target.hasAttribute('required')) validateField({ target: e.target });
            }
        });
    });
}

function validateField(e) {
    const field = e.target;
    // Don't validate hidden fields
    if (field.offsetParent === null) return true;

    const value = field.value.trim();
    field.classList.remove('error');

    if (field.hasAttribute('required') && !value) {
        showFieldError(field, 'This field is required');
        return false;
    }

    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(field, 'Please enter a valid email address');
            return false;
        }
    }
    return true;
}

function showFieldError(field, message) {
    field.classList.add('error');
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) existingError.remove();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.color = '#ef4444';
    errorDiv.style.fontSize = '0.875rem';
    errorDiv.style.marginTop = '0.25rem';
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(e) {
    const field = e.target;
    field.classList.remove('error');
    const errorMessage = field.parentNode.querySelector('.error-message');
    if (errorMessage) errorMessage.remove();
}

function validateForm(form) {
    const requiredFields = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    requiredFields.forEach(field => {
        if (field.offsetParent !== null) {
            if (!validateField({ target: field })) isValid = false;
        }
    });
    return isValid;
}

/* =========================================
   AUTH LOGIC
   ========================================= */

function openAuthModal() {
    if (currentUser) {
        openDashboard();
    } else {
        const modal = document.getElementById('authModal');
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        switchTab('login');
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    resetAuthForm();
}

function switchTab(mode) {
    isLoginMode = mode === 'login';
    
    // 1. Update Tab UI
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const buttons = document.querySelectorAll('.tab-btn');
    if (isLoginMode && buttons.length > 0) buttons[0].classList.add('active');
    else if (buttons.length > 1) buttons[1].classList.add('active');

    // 2. Titles
    document.getElementById('modalTitle').textContent = isLoginMode ? 'Welcome Back' : 'Join CFS Kenya';
    document.getElementById('authSubmitBtn').textContent = isLoginMode ? 'Sign In' : 'Create Account';

    // 3. Toggle visibility of signup-only fields
    const fields = ['nameField', 'confirmPasswordField', 'organizationField', 'locationField', 'userTypeSelection', 'schoolFields'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isLoginMode ? 'none' : 'block';
    });

    // 4. Forgot Password
    const forgotPassField = document.getElementById('forgotPassword');
    if (forgotPassField) forgotPassField.style.display = isLoginMode ? 'block' : 'none';

    // 5. Handle Required Attributes
    const nameInput = document.getElementById('authName');
    const confirmPassInput = document.getElementById('confirmPassword');
    const locationInput = document.getElementById('location');
    const orgInput = document.getElementById('authOrganization');

    if (isLoginMode) {
        // Remove requirements for login
        if (nameInput) nameInput.removeAttribute('required');
        if (confirmPassInput) confirmPassInput.removeAttribute('required');
        if (locationInput) locationInput.removeAttribute('required');
        if (orgInput) orgInput.removeAttribute('required');
        
        const schoolFields = document.getElementById('schoolFields');
        if (schoolFields) {
            schoolFields.querySelectorAll('input, select').forEach(i => i.removeAttribute('required'));
        }
    } else {
        // Set requirements for Signup
        if (nameInput) nameInput.setAttribute('required', 'true');
        if (confirmPassInput) confirmPassInput.setAttribute('required', 'true');
        if (locationInput) locationInput.setAttribute('required', 'true');

        // Re-apply User Type logic to ensure correct labels/requirements
        const activeTypeBtn = document.querySelector('.user-type-btn.active');
        if (activeTypeBtn) {
            handleUserTypeSelect({ currentTarget: activeTypeBtn });
        } else {
            // Default to donor if none selected
            const donorBtn = document.querySelector('.user-type-btn[data-type="donor"]');
            if (donorBtn) handleUserTypeSelect({ currentTarget: donorBtn });
        }
    }

    // 6. Admin Secret
    const adminSecretField = document.getElementById('adminSecretField');
    if (adminSecretField) {
        adminSecretField.style.display = (!isLoginMode && selectedUserType === 'admin') ? 'block' : 'none';
        const input = adminSecretField.querySelector('input');
        if (selectedUserType === 'admin' && !isLoginMode) input.setAttribute('required', 'true');
        else input.removeAttribute('required');
    }

    resetAuthForm();
}

function handleUserTypeSelect(e) {
    document.querySelectorAll('.user-type-btn').forEach(btn => btn.classList.remove('active'));
    const btn = e.currentTarget;
    btn.classList.add('active');
    selectedUserType = btn.dataset.type;

    const nameLabel = document.querySelector('label[for="authName"]');
    const nameInput = document.getElementById('authName');
    const orgField = document.getElementById('organizationField');
    const orgInput = document.getElementById('authOrganization');
    const adminSecretField = document.getElementById('adminSecretField');
    const schoolFields = document.getElementById('schoolFields');

    // Admin Secret Logic
    if (adminSecretField) {
        adminSecretField.style.display = selectedUserType === 'admin' && !isLoginMode ? 'block' : 'none';
        const secretInput = adminSecretField.querySelector('input');
        if (selectedUserType === 'admin' && !isLoginMode) secretInput.setAttribute('required', 'true');
        else secretInput.removeAttribute('required');
    }

    // School vs Donor/Admin Logic
    if (selectedUserType === 'school') {
        if (nameLabel) nameLabel.textContent = 'School Name *';
        if (nameInput) nameInput.placeholder = 'Enter official school name';
        
        // Hide Organization (Name = School Name)
        if (orgField) orgField.style.display = 'none';
        if (orgInput) orgInput.removeAttribute('required');

        // Show School Fields
        if (schoolFields && !isLoginMode) {
            schoolFields.style.display = 'block';
            schoolFields.querySelectorAll('input, select, textarea').forEach(input => {
                if(input.name !== 'description') input.setAttribute('required', 'true');
            });
        }
    } else {
        if (nameLabel) nameLabel.textContent = 'Full Name *';
        if (nameInput) nameInput.placeholder = 'Enter your full name';

        if (schoolFields) {
            schoolFields.style.display = 'none';
            schoolFields.querySelectorAll('input, select, textarea').forEach(input => {
                input.removeAttribute('required');
            });
        }

        if (orgField && !isLoginMode) {
            orgField.style.display = 'block';
            const orgLabel = orgField.querySelector('label');
            
            if (selectedUserType === 'donor') {
                if (orgLabel) orgLabel.textContent = 'Organization (Optional)';
                if (orgInput) {
                    orgInput.placeholder = 'Company or organization';
                    orgInput.removeAttribute('required');
                }
            } else if (selectedUserType === 'admin') {
                if (orgLabel) orgLabel.textContent = 'Organization *';
                if (orgInput) {
                    orgInput.placeholder = 'Organization name';
                    orgInput.setAttribute('required', 'true');
                }
            }
        }
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const authData = Object.fromEntries(formData.entries());
    authData.user_type = selectedUserType;

    if (!validateForm(e.target)) return;

    if (!isLoginMode) {
        if (authData.password !== authData.confirmPassword) {
            showNotification('Passwords do not match!', 'error');
            return;
        }
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    const endpoint = isLoginMode ? '/auth/login' : '/auth/register';

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authData)
        });

        const result = await response.json();

        if (response.ok) {
            if (isLoginMode) {
                // Store token and user
                authToken = result.token;
                localStorage.setItem('token', authToken); // Use LocalStorage for token persistence
                
                currentUser = {
                    user_id: result.user.id,
                    name: result.user.name,
                    email: result.user.email,
                    type: result.user.user_type,
                    organization: result.user.organization || '',
                    location: result.user.location || ''
                };
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                sessionStorage.setItem('authToken', authToken);

                closeAuthModal();
                showNotification(`Welcome back, ${currentUser.name}!`, 'success');
                
                // Update Login Button to Dashboard Button
                const loginBtn = document.querySelector('.login-btn');
                if (loginBtn) {
                    loginBtn.innerHTML = '<i class="fas fa-user"></i> Dashboard';
                    loginBtn.onclick = openDashboard;
                }
                
                openDashboard();
            } else {
                showNotification('Account created successfully! Please login.', 'success');
                switchTab('login');
            }
        } else {
            showNotification(result.message || 'Authentication failed', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Connection error.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function resetAuthForm() {
    const form = document.getElementById('authForm');
    if (form) {
        form.reset();
        clearAllErrors();
    }
}

function clearAllErrors() {
    document.querySelectorAll('.error-message').forEach(error => error.remove());
    document.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
}

function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('token');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken');
    
    closeDashboard();
    showNotification('Logged out.', 'success');
    
    // Reset Login Button
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-user"></i> Login';
        loginBtn.onclick = openAuthModal;
    }
    
    window.location.reload();
}

/* =========================================
   DASHBOARD LOGIC
   ========================================= */

function openDashboard() {
    const modal = document.getElementById('dashboardModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    if (currentUser) {
        const userNameEl = document.getElementById('dashboardUserName');
        const userTypeEl = document.getElementById('dashboardUserType');
        if (userNameEl) userNameEl.textContent = currentUser.name;
        if (userTypeEl) userTypeEl.textContent = currentUser.type;
        updateSettingsForm();

        const donorNav = document.getElementById('donorNav');
        const schoolNav = document.getElementById('schoolNav');
        const adminNav = document.getElementById('adminNav');

        if (donorNav) donorNav.style.display = 'none';
        if (schoolNav) schoolNav.style.display = 'none';
        if (adminNav) adminNav.style.display = 'none';

        // Hide all specific dashboard divs
        ['donorDashboard', 'schoolDashboard', 'adminDashboard'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        if (currentUser.type === 'school') {
            if (schoolNav) schoolNav.style.display = 'block';
            const schoolDash = document.getElementById('schoolDashboard');
            if (schoolDash) schoolDash.style.display = 'block';
            showDashboardSection('schoolOverview');
            loadSchoolDashboardData();
        }
        else if (currentUser.type === 'admin') {
            if (adminNav) adminNav.style.display = 'block';
            const adminDash = document.getElementById('adminDashboard');
            if (adminDash) adminDash.style.display = 'block';
            showDashboardSection('adminOverview');
            loadAdminDashboardData();
        }
        else {
            // Default Donor
            if (donorNav) donorNav.style.display = 'block';
            const donorDash = document.getElementById('donorDashboard');
            if (donorDash) donorDash.style.display = 'block';
            showDashboardSection('overview');
            loadUserDashboardData();
            prefillDashboardDonationForm();
        }
    }
}

function closeDashboard() {
    const modal = document.getElementById('dashboardModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function showDashboardSection(sectionName) {
    document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) targetSection.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        const onclickAttr = item.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes(`'${sectionName}'`)) {
            item.classList.add('active');
        }
    });
}

function updateSettingsForm() {
    if (currentUser) {
        if (document.getElementById('settingsName')) document.getElementById('settingsName').value = currentUser.name;
        if (document.getElementById('settingsEmail')) document.getElementById('settingsEmail').value = currentUser.email;
        if (document.getElementById('settingsOrganization')) document.getElementById('settingsOrganization').value = currentUser.organization;
        if (document.getElementById('settingsLocation')) document.getElementById('settingsLocation').value = currentUser.location;
    }
}

/* =========================================
   DONATION LOGIC
   ========================================= */

async function handleDonationSubmit(e) {
    e.preventDefault();
    const formElement = e.target;
    const formData = new FormData(formElement);
    const donationData = Object.fromEntries(formData.entries());

    if (!validateForm(formElement)) return;
    if (currentUser && currentUser.user_id) donationData.user_id = currentUser.user_id;

    const submitBtn = formElement.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/donations`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(donationData)
        });

        const result = await response.json();
        if (response.ok) {
            formElement.reset();
            showNotification('Thank you for your generous donation!', 'success');
            if (currentUser && currentUser.type === 'donor') {
                await loadUserDashboardData();
                if (formElement.id === 'dashboardDonationForm') {
                    showDashboardSection('donations');
                }
            }
        } else {
            showNotification(result.message || 'Submission failed', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Connection error.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function prefillDashboardDonationForm() {
    if (!currentUser) return;
    if (document.getElementById('dashDonorName')) document.getElementById('dashDonorName').value = currentUser.name || '';
    if (document.getElementById('dashEmail')) document.getElementById('dashEmail').value = currentUser.email || '';
    if (document.getElementById('dashOrganization')) document.getElementById('dashOrganization').value = currentUser.organization || '';
    if (document.getElementById('dashAddress') && currentUser.location) {
        document.getElementById('dashAddress').value = currentUser.location;
    }
}

/* =========================================
   SCHOOL REQUEST LOGIC
   ========================================= */

async function handleRequestSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    const formData = new FormData(e.target);
    const requestData = Object.fromEntries(formData.entries());

    if (requestData.quantity) {
        requestData.quantity = parseInt(requestData.quantity, 10);
    }

    try {
        const response = await fetch(`${API_URL}/schools/requests`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Request submitted successfully!', 'success');
            closeRequestModal();
            e.target.reset();
            const schoolDash = document.getElementById('schoolDashboard');
            if (schoolDash && schoolDash.style.display !== 'none') {
                loadSchoolDashboardData();
            }
        } else {
            if (data.errors && Array.isArray(data.errors)) {
                const errorMsg = data.errors.map(err => `${err.path || err.param}: ${err.msg}`).join(', ');
                showNotification(`Validation Error: ${errorMsg}`, 'error');
                console.error('Server Validation Details:', data.errors);
            } else {
                showNotification(data.message || 'Failed to submit request', 'error');
            }
        }
    } catch (error) {
        console.error('Request error:', error);
        showNotification('Server connection failed.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function openRequestModal() {
    const modal = document.getElementById('requestModal');
    if (modal) {
        modal.style.display = 'block';
        // Prefill if possible
        if (currentUser) {
            const form = document.getElementById('requestForm');
            if (form) {
                const schoolName = form.querySelector('[name="school_name"]');
                const email = document.getElementById('req_email');
                const contact = form.querySelector('[name="contact_person"]');
                const loc = form.querySelector('[name="location"]');

                if (schoolName) schoolName.value = currentUser.organization || currentUser.name || '';
                if (email) email.value = currentUser.email || '';
                if (contact) contact.value = currentUser.name || ''; // Often same as user
                if (loc) loc.value = currentUser.location || '';
            }
        }
    }
}

function closeRequestModal() {
    const modal = document.getElementById('requestModal');
    if (modal) modal.style.display = 'none';
}

async function loadSchoolDashboardData() {
    if (!currentUser || !currentUser.user_id) return;
    try {
        const response = await fetch(`${API_URL}/schools/requests/user/${currentUser.user_id}`, {
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            renderSchoolRequests(data.requests || []);
        }
    } catch (error) {
        console.error('Error loading school data:', error);
    }
}

function renderSchoolRequests(requests) {
    const tbody = document.getElementById('schoolRequestsBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No requests yet.</td></tr>';
        return;
    }
    requests.forEach(req => {
        const date = new Date(req.created_at).toLocaleDateString();
        const statusClass = getStatusClass(req.status);
        const statusLabel = req.status.charAt(0).toUpperCase() + req.status.slice(1);
        tbody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td style="text-transform: capitalize;">${req.computer_type}</td>
                <td>${req.quantity}</td>
                <td><span class="status ${statusClass}">${statusLabel}</span></td>
            </tr>
        `;
    });
}

/* =========================================
   ADMIN LOGIC
   ========================================= */

async function loadAdminDashboardData() {
    // 1. Stats
    try {
        const response = await fetch(`${API_URL}/stats/dashboard`, { headers: getAuthHeaders() });
        if (response.ok) {
            const data = await response.json();
            const pendDon = document.getElementById('adminPendingDonations');
            const pendReq = document.getElementById('adminPendingRequests');
            if (pendDon) pendDon.textContent = data.statistics.pending.donations || 0;
            if (pendReq) pendReq.textContent = data.statistics.pending.requests || 0;
        }
    } catch (error) { console.error('Admin stats error:', error); }

    // 2. Impact Report
    try {
        const resp = await fetch(`${API_URL}/stats/impact-report`, { headers: getAuthHeaders() });
        if (resp.ok) {
            const report = await resp.json();
            const totDon = document.getElementById('totalComputersDonated');
            const stuReach = document.getElementById('studentsReached');
            if (totDon) totDon.textContent = report.total_computers_donated || 0;
            if (stuReach) stuReach.textContent = report.students_reached || 0;
        }
    } catch (error) { console.error('Impact report error:', error); }

    // 3. Lists
    loadAdminDonations();
    loadAdminRequests();
    loadInventory();
    loadBeneficiaries();
    loadAdvancedReports();
}

async function loadBeneficiaries() {
    const container = document.getElementById('beneficiariesList');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_URL}/stats/beneficiaries`, { headers: getAuthHeaders() });
        if(response.ok) {
            const beneficiaries = await response.json();
            let html = '<div class="timeline">';
            if (beneficiaries.length === 0) html += '<p style="text-align:center;">No beneficiaries yet.</p>';
            
            beneficiaries.forEach(b => {
                const date = new Date(b.date_received).toLocaleDateString();
                const time = new Date(b.date_received).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                html += `
                    <div class="timeline-item">
                        <div class="time-marker">${date}<br><small>${time}</small></div>
                        <div class="content">
                            <h4>${b.school_name} <span class="badge success">Received</span></h4>
                            <p><strong>Received:</strong> ${b.quantity} ${b.computer_type}(s)</p>
                            <p><strong>Reason:</strong> "<em>${b.reason_for_request}</em>"</p>
                            <p><small><i class="fas fa-map-marker-alt"></i> ${b.location}</small></p>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        }
    } catch(err) { console.error('Beneficiaries error', err); }
}

async function loadInventory(filterStatus = 'received') {
    const tbody = document.getElementById('adminInventoryBody');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_URL}/inventory?status=${filterStatus}`, {
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const inventory = await response.json();
            tbody.innerHTML = '';
            if(inventory.length === 0) {
                 tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No inventory items found.</td></tr>';
                 return;
            }

            inventory.forEach(item => {
                const actionHtml = filterStatus === 'received' 
                    ? `<button class="btn-icon" onclick="openRefurbishModal('${item.id}', '${item.computer_type}')" title="Refurbish"><i class="fas fa-tools"></i></button>`
                    : (filterStatus === 'ready' ? `<button onclick="openFulfillmentModal('${item.id}')" class="btn-sm btn-primary">Fulfill</button>` : '-');

                tbody.innerHTML += `
                    <tr>
                        <td>${item.serial_number}</td>
                        <td>${item.computer_type}</td>
                        <td>${item.condition_received}</td>
                        <td><span class="status ${getStatusClass(item.status)}">${item.status}</span></td>
                        <td>${actionHtml}</td>
                    </tr>`;
            });
        }
    } catch (error) { console.error('Inventory load error:', error); }
}

async function openRefurbishModal(inventoryId, currentType) {
    const newType = prompt("Confirm Equipment Type (desktop, laptop, tablet):", currentType);
    if (!['desktop', 'laptop', 'tablet'].includes(newType)) return alert("Invalid type");

    const newCondition = prompt("Set Condition (excellent, good, fair):", "good");
    if(!newCondition) return;

    try {
        const response = await fetch(`${API_URL}/inventory/${inventoryId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                computer_type: newType,
                status: 'ready',
                condition_after_refurbishment: newCondition
            })
        });

        if (response.ok) {
            showNotification("Item refurbished and ready for stock.", "success");
            loadInventory('received');
        } else {
            showNotification("Failed to update item.", "error");
        }
    } catch(err) { console.error(err); }
}

async function loadAdminDonations() {
    try {
        const response = await fetch(`${API_URL}/donations`, { headers: getAuthHeaders() });
        if (response.ok) {
            const data = await response.json();
            renderAdminDonationsTable(data.donations || []);
        }
    } catch (error) { console.error('Admin donations error:', error); }
}

function renderAdminDonationsTable(donations) {
    const tbody = document.getElementById('adminDonationsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (donations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No donations found.</td></tr>';
        return;
    }
    donations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    donations.forEach(donation => {
        const date = new Date(donation.created_at).toLocaleDateString();
        const options = ['pending', 'approved', 'processing', 'delivered', 'rejected', 'collected'];
        let selectHtml = `<select onchange="updateDonationStatus('${donation.id}', this.value)" class="status-select">`;
        options.forEach(opt => {
            selectHtml += `<option value="${opt}" ${donation.status === opt ? 'selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`;
        });
        selectHtml += `</select>`;

        tbody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>${donation.donor_name}</td>
                <td style="text-transform: capitalize;">${donation.computer_type}</td>
                <td>${donation.quantity}</td>
                <td><span class="status ${getStatusClass(donation.status)}">${donation.status}</span></td>
                <td>${selectHtml}</td>
            </tr>`;
    });
}

// frontend/js/main.js

async function updateDonationStatus(id, status) {
    let collectionDate = null;

    // 1. If Approving, ask for the Collection Date
    if (status === 'approved') {
        // Create a simple date prompt (In a real app, use a modal with a date picker)
        const defaultDate = new Date().toISOString().split('T')[0]; // Today
        collectionDate = prompt("Please confirm the Collection/Pickup Date (YYYY-MM-DD):", defaultDate);
        
        if (collectionDate === null) {
            loadAdminDashboardData(); // User clicked cancel
            return; 
        }
        
        // Basic validation
        if (!collectionDate) {
            alert("Collection date is required for approval.");
            return;
        }
    } 
    // 2. Standard confirmation for other statuses
    else {
        if (!confirm(`Are you sure you want to change status to ${status}?`)) {
            loadAdminDashboardData();
            return;
        }
    }

    try {
        const response = await fetch(`${API_URL}/donations/${id}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                status: status,
                collection_date: collectionDate // Send the date to backend
            })
        });

        if (response.ok) {
            if (status === 'approved') {
                showNotification(`Donation approved! Appreciation email sent with collection date: ${collectionDate}`, 'success');
            } else {
                showNotification(`Donation marked as ${status}`, 'success');
            }
            loadAdminDashboardData();
        } else {
            showNotification('Failed to update status', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Connection error', 'error');
    }
}

async function loadAdminRequests() {
    try {
        const response = await fetch(`${API_URL}/schools/requests`, { headers: getAuthHeaders() });
        if (response.ok) {
            const data = await response.json();
            renderAdminRequestsTable(data.requests || []);
        }
    } catch (error) { console.error('Admin requests error:', error); }
}
 

function renderAdminRequestsTable(requests) {
    const tbody = document.getElementById('adminRequestsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No requests found.</td></tr>';
        return;
    }

    requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Update the Table Header in your HTML first! (See note below)
    // Or we can just render the rows assuming you update the HTML manually
    
    requests.forEach(req => {
        const date = new Date(req.created_at).toLocaleDateString();
        
        // Handle Reason Text (Truncate if too long)
        const fullReason = req.reason_for_request || req.justification || "No reason provided";
        const shortReason = fullReason.length > 30 ? fullReason.substring(0, 30) + '...' : fullReason;

        const options = ['pending', 'approved', 'fulfilled', 'rejected'];
        let selectHtml = `<select onchange="initiateRequestStatusUpdate('${req.id}', this.value, '${req.status}')" class="status-select" ${req.status === 'fulfilled' ? 'disabled' : ''}>`;
        options.forEach(opt => {
            selectHtml += `<option value="${opt}" ${req.status === opt ? 'selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`;
        });
        selectHtml += `</select>`;

        tbody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>
                    <strong>${req.school_name}</strong><br>
                    <small style="color:#666;">${req.location}</small>
                </td>
                <td style="text-transform: capitalize;">${req.computer_type}</td>
                <td>${req.quantity}</td>
                
                <td title="${fullReason}" style="cursor:help; max-width: 200px;">
                    ${shortReason} <i class="fas fa-info-circle" style="color:#aaa; font-size:0.8em;"></i>
                </td>

                <td><span class="status ${getStatusClass(req.status)}">${req.status}</span></td>
                <td>${selectHtml}</td>
            </tr>
        `;
    });
}

async function initiateRequestStatusUpdate(id, newStatus, oldStatus) {
    // Logic to capture comments for email
    let comment = '';
    
    if (newStatus === 'rejected') {
        comment = prompt("Please provide a reason for rejection (this will be emailed to the school):");
        if (comment === null) {
            loadAdminRequests(); // Revert
            return;
        }
    } else if (newStatus === 'approved') {
        const addNote = confirm("Do you want to add a custom note to the approval email?");
        if (addNote) {
            comment = prompt("Enter your note:");
            if(comment === null) comment = '';
        }
    } else if (newStatus === 'fulfilled') {
        alert("Please use the 'Fulfill' button in the Inventory tab to assign specific computers.");
        loadAdminRequests(); // Revert
        return; 
    }

    try {
        const response = await fetch(`${API_URL}/schools/requests/${id}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: newStatus, admin_comment: comment })
        });
        if (response.ok) {
            showNotification(`Request ${newStatus} successfully!`, 'success');
            loadAdminDashboardData();
        } else {
            showNotification('Update failed', 'error');
            loadAdminRequests();
        }
    } catch (e) { console.error(e); }
}

/* =========================================
   FULFILLMENT LOGIC
   ========================================= */

async function openFulfillmentModal(inventoryId) {
    const modal = document.getElementById('fulfillmentModal');
    const hiddenInput = document.getElementById('fulfillInventoryId');
    const select = document.getElementById('schoolSelect');
    
    if (!modal || !hiddenInput || !select) return;

    hiddenInput.value = inventoryId;
    modal.style.display = 'block';

    try {
        const response = await fetch(`${API_URL}/schools/requests?status=approved`, { headers: getAuthHeaders() });
        if (response.ok) {
            const data = await response.json();
            const requests = data.requests || [];
            select.innerHTML = '<option value="">Select a school...</option>';
            requests.forEach(req => {
                select.innerHTML += `<option value="${req.id}">${req.school_name} - ${req.computer_type} (${req.quantity} needed)</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading requests', error);
        select.innerHTML = '<option>Error loading schools</option>';
    }
}

function closeFulfillmentModal() {
    const modal = document.getElementById('fulfillmentModal');
    if (modal) modal.style.display = 'none';
}

async function handleFulfillmentSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const requestId = formData.get('requestId');
    const inventoryId = formData.get('inventoryId');

    // Currently the API expects array of inventory IDs
    const payload = {
        requestId: requestId,
        inventoryItemIds: [inventoryId]
    };

    try {
        const response = await fetch(`${API_URL}/schools/fulfill`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showNotification('Computer assigned successfully!', 'success');
            closeFulfillmentModal();
            loadInventory('ready');
            loadBeneficiaries();
        } else {
            const err = await response.json();
            showNotification(err.message || 'Assignment failed', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Connection error', 'error');
    }
}

/* =========================================
   HELPER FUNCTIONS
   ========================================= */

async function handleContactSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const contactData = Object.fromEntries(formData.entries());
    if (!validateForm(e.target)) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;
    try {
        const response = await fetch(`${API_URL}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactData)
        });
        const result = await response.json();
        if (response.ok) {
            e.target.reset();
            showNotification('Message sent!', 'success');
        } else {
            showNotification(result.message || 'Failed to send', 'error');
        }
    } catch (error) {
        showNotification('Connection error.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `<div class="notification-content"><i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i><span>${message}</span><button class="notification-close" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-times"></i></button></div>`;
    notification.style.cssText = `position: fixed; top: 100px; right: 20px; background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'}; color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 3000; max-width: 400px; animation: slideInRight 0.3s ease;`;
    document.body.appendChild(notification);
    setTimeout(() => { if (notification.parentNode) notification.remove(); }, 5000);
}

function handleModalClick(e) {
    if (e.target === document.getElementById('authModal')) closeAuthModal();
    if (e.target === document.getElementById('dashboardModal')) closeDashboard();
    if (e.target === document.getElementById('requestModal')) closeRequestModal();
    if (e.target === document.getElementById('fulfillmentModal')) closeFulfillmentModal();
}

function animateOnScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('fade-in-up'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.value-card, .service-card, .stat-card, .story-card, .region-card').forEach(el => observer.observe(el));
}

function getStatusClass(status) {
    switch (status) {
        case 'delivered': case 'approved': case 'fulfilled': return 'delivered'; // Green
        case 'pending': case 'processing': return 'processing'; // Orange/Blue
        case 'rejected': return 'error'; // Red
        case 'received': return 'processing';
        case 'ready': return 'delivered';
        default: return '';
    }
}

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .notification-content { display: flex; align-items: center; gap: 12px; } .notification-close { background: none; border: none; color: inherit; cursor: pointer; padding: 4px; border-radius: 4px; transition: background-color 0.2s; } .notification-close:hover { background-color: rgba(255, 255, 255, 0.2); } .error { border-color: #ef4444 !important; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important; } .hamburger.active span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); } .hamburger.active span:nth-child(2) { opacity: 0; } .hamburger.active span:nth-child(3) { transform: rotate(-45deg) translate(7px, -6px); }`;
document.head.appendChild(style);

// Placeholder for Donor User Dashboard (from previous code)
async function loadUserDashboardData() {
    if (!currentUser || !currentUser.user_id) return;
    try {
        const response = await fetch(`${API_URL}/donations/user/${currentUser.user_id}`, { headers: getAuthHeaders() });
        if (response.ok) {
            const data = await response.json();
            const donations = data.donations || [];
            updateDashboardStats(donations);
            renderDonationsTable(donations);
            renderRecentActivity(donations);
        }
    } catch (e) { console.error(e); }
}


// frontend/js/main.js

async function loadAdvancedReports() {
    // Get filter values from HTML inputs (we will add these inputs next)
    const startDate = document.getElementById('reportStartDate')?.value;
    const endDate = document.getElementById('reportEndDate')?.value;
    
    let queryParams = '';
    if (startDate && endDate) {
        queryParams = `?start_date=${startDate}&end_date=${endDate}`;
    }

    try {
        const response = await fetch(`${API_URL}/stats/reports${queryParams}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            renderReportsView(data);
        } else {
            console.error('Failed to load reports');
        }
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

// frontend/js/main.js

function renderReportsView(data) {
    const container = document.getElementById('adminReportsContent');
    if (!container) return;

    // 1. Summary Cards (Kept the same)
    let html = `
        <div class="dashboard-stats" style="margin-bottom: 30px;">
            <div class="stat-card">
                <div class="stat-icon" style="background: #e0e7ff; color: #3730a3;"><i class="fas fa-hand-holding-heart"></i></div>
                <div class="stat-info">
                    <div class="stat-number">${data.summary.total_donors}</div>
                    <div class="stat-label">Total Donors</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #fce7f3; color: #be185d;"><i class="fas fa-school"></i></div>
                <div class="stat-info">
                    <div class="stat-number">${data.summary.total_schools}</div>
                    <div class="stat-label">Registered Schools</div>
                </div>
            </div>
        </div>
    `;

    // --- SECTION 2A: APPROVED DONATIONS TABLE ---
    html += `<h3>Approved Donations (Incoming)</h3>
             <div class="donations-table" style="margin-bottom: 30px;">
             <table>
                <thead>
                    <tr>
                        <th>Date Approved</th>
                        <th>Donor Name</th>
                        <th>Type</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>`;
    
    const donations = data.approvals.donations || [];
    
    if (donations.length === 0) {
        html += `<tr><td colspan="4" style="text-align:center">No approved donations in this period</td></tr>`;
    } else {
        donations.forEach(d => {
            html += `
                <tr>
                    <td>${new Date(d.updated_at).toLocaleDateString()}</td>
                    <td>${d.donor_name}</td>
                    <td style="text-transform: capitalize;">${d.computer_type}</td>
                    <td>${d.quantity}</td>
                </tr>`;
        });
    }
    html += `</tbody></table></div>`;

    // --- SECTION 2B: APPROVED REQUESTS TABLE ---
    html += `<h3>Approved School Requests (Outgoing)</h3>
             <div class="donations-table" style="margin-bottom: 30px;">
             <table>
                <thead>
                    <tr>
                        <th>Date Approved</th>
                        <th>School Name</th>
                        <th>Location</th>
                        <th>Type</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>`;

    const requests = data.approvals.requests || [];

    if (requests.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center">No approved requests in this period</td></tr>`;
    } else {
        requests.forEach(r => {
            html += `
                <tr>
                    <td>${new Date(r.updated_at).toLocaleDateString()}</td>
                    <td>${r.school_name}</td>
                    <td style="text-transform: capitalize;">${r.location}</td>
                    <td style="text-transform: capitalize;">${r.computer_type}</td>
                    <td>${r.quantity}</td>
                </tr>`;
        });
    }
    html += `</tbody></table></div>`;

    // 3. Distribution by Location & Month (Kept the same)
    html += `<h3>Distribution Report (Location & Month)</h3>
             <div class="donations-table">
             <table>
                <thead>
                    <tr>
                        <th>Location</th>
                        <th>Month Given Out</th>
                        <th>Total Computers</th>
                    </tr>
                </thead>
                <tbody>`;

    const locations = Object.keys(data.distribution_by_location_month);
    
    if (locations.length === 0) {
        html += `<tr><td colspan="3" style="text-align:center">No distribution data found</td></tr>`;
    } else {
        locations.forEach(location => {
            const months = data.distribution_by_location_month[location];
            Object.entries(months).forEach(([month, count]) => {
                html += `
                    <tr>
                        <td style="font-weight:bold; text-transform:capitalize;">${location}</td>
                        <td>${month}</td>
                        <td>${count}</td>
                    </tr>`;
            });
        });
    }
    html += `</tbody></table></div>`;

    container.innerHTML = html;
}

function updateDashboardStats(donations) {
    const totalDonationsEl = document.getElementById('dashTotalDonations');
    if (totalDonationsEl) totalDonationsEl.textContent = donations.length;
}

function renderDonationsTable(donations) {
    const tbody = document.getElementById('donationTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    donations.forEach(donation => {
        const date = new Date(donation.created_at).toLocaleDateString();
        tbody.innerHTML += `<tr><td>${date}</td><td>${donation.computer_type}</td><td>${donation.quantity}</td><td><span class="status ${getStatusClass(donation.status)}">${donation.status}</span></td></tr>`;
    });
}

function renderRecentActivity(donations) {
   // Simplified for brevity, can paste full version if needed
   const activityList = document.getElementById('dashActivityList');
   if(activityList) activityList.innerHTML = donations.length ? '' : 'No activity';
   donations.slice(0,3).forEach(d => {
       activityList.innerHTML += `<div class="activity-item"><div class="activity-content">${d.status}: ${d.quantity} ${d.computer_type}</div></div>`;
   });
} 