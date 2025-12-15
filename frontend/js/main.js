const API_URL = "http://localhost:3000/api";

let currentUser = null;
let authToken = null;
let isLoginMode = true;
let selectedUserType = 'donor';

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    checkSession();
});

function initializeApp() {
    setupEventListeners();
    setupSmoothScrolling();
    setupMobileMenu();
    setupFormValidation();
    animateOnScroll();
    switchTab('login');
}
 
function checkSession() {
    const storedUser = sessionStorage.getItem('currentUser');
    const storedToken = sessionStorage.getItem('authToken');
    
    if (storedUser && storedToken) {
        currentUser = JSON.parse(storedUser);
        authToken = storedToken; 
    }
}
 
function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
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
    
     
    document.querySelectorAll('.user-type-btn').forEach(btn => btn.addEventListener('click', handleUserTypeSelect));
    window.addEventListener('click', handleModalClick);

    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) logoutBtn.addEventListener('click', logout);
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
        form.addEventListener('input', function(e) {
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
               clearFieldError(e);
            }
        });
        form.addEventListener('focusout', function(e) {
             if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
               if(e.target.hasAttribute('required')) validateField({target: e.target});
            }
        });
    });
}

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    field.classList.remove('error');
     
    if (field.offsetParent === null) return true;

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
        console.error(error);
        showNotification('Connection error.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
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

function openAuthModal() {
    const modal = document.getElementById('authModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    if(isLoginMode) switchTab('login'); 
    else switchTab('signup');
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    resetAuthForm();
}

function switchTab(mode) {
    isLoginMode = mode === 'login';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const buttons = document.querySelectorAll('.tab-btn');
    if(isLoginMode && buttons.length > 0) buttons[0].classList.add('active');
    else if(buttons.length > 1) buttons[1].classList.add('active');
    
    document.getElementById('modalTitle').textContent = isLoginMode ? 'Welcome Back' : 'Join CFS Kenya';
    document.getElementById('authSubmitBtn').textContent = isLoginMode ? 'Sign In' : 'Create Account';
     
    const fields = ['nameField', 'confirmPasswordField', 'organizationField', 'locationField', 'userTypeSelection'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = isLoginMode ? 'none' : 'block';
    });
    
    const forgotPassField = document.getElementById('forgotPassword');
    if(forgotPassField) forgotPassField.style.display = isLoginMode ? 'block' : 'none';
     
    const nameInput = document.getElementById('authName');
    const confirmPassInput = document.getElementById('confirmPassword');
    const locationInput = document.getElementById('location');
    const orgInput = document.getElementById('authOrganization');  
    
    if (isLoginMode) { 
        if(nameInput) nameInput.removeAttribute('required');
        if(confirmPassInput) confirmPassInput.removeAttribute('required');
        if(locationInput) locationInput.removeAttribute('required');
        if(orgInput) orgInput.removeAttribute('required');
    } else { 
        if(nameInput) nameInput.setAttribute('required', 'true');
        if(confirmPassInput) confirmPassInput.setAttribute('required', 'true');
        if(locationInput) locationInput.setAttribute('required', 'true');
         
        const activeTypeBtn = document.querySelector('.user-type-btn.active');
        if(activeTypeBtn && (activeTypeBtn.dataset.type === 'school' || activeTypeBtn.dataset.type === 'admin')) {
             if(orgInput) orgInput.setAttribute('required', 'true');
        } else {
             if(orgInput) orgInput.removeAttribute('required');
        }
    }
    
    resetAuthForm();
}

function handleUserTypeSelect(e) {
    document.querySelectorAll('.user-type-btn').forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    selectedUserType = e.currentTarget.dataset.type;
    
    const orgField = document.getElementById('organizationField');
    const orgLabel = orgField.querySelector('label');
    const orgInput = document.getElementById('authOrganization');  
    
    if (!orgLabel || !orgInput) return;

    if (selectedUserType === 'school') {
        orgLabel.textContent = 'School Name *';
        orgInput.placeholder = 'Enter school name';
        orgInput.setAttribute('required', 'true');
    } else if (selectedUserType === 'donor') {
        orgLabel.textContent = 'Organization (Optional)';
        orgInput.placeholder = 'Company or organization';
        orgInput.removeAttribute('required');
    } else {
        orgLabel.textContent = 'Organization *';
        orgInput.placeholder = 'Organization name';
        orgInput.setAttribute('required', 'true');
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

        let result;
        try {
            result = await response.json();
        } catch (jsonError) {
             throw new Error("Server returned invalid JSON.");
        }

        if (response.ok) {
            if (isLoginMode) { 
                authToken = result.token;
                sessionStorage.setItem('authToken', authToken);

                currentUser = {
                    user_id: result.user.id, 
                    name: result.user.name,
                    email: result.user.email,
                    type: result.user.user_type,  
                    organization: result.user.organization || '',
                    location: result.user.location || ''
                };
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                closeAuthModal();
                openDashboard();
                showNotification(`Welcome back, ${currentUser.name}!`, 'success');
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
    if(form) {
        form.reset();
        document.querySelectorAll('.error-message').forEach(error => error.remove());
        document.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
    }
}

function openDashboard() {
    const modal = document.getElementById('dashboardModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    if (currentUser) {
        const userNameEl = document.getElementById('dashboardUserName');
        const userTypeEl = document.getElementById('dashboardUserType');
        if(userNameEl) userNameEl.textContent = currentUser.name;
        if(userTypeEl) userTypeEl.textContent = currentUser.type;
        updateSettingsForm();
 
        const donorNav = document.getElementById('donorNav');
        const schoolNav = document.getElementById('schoolNav');
        const adminNav = document.getElementById('adminNav');
        
        if (donorNav) donorNav.style.display = 'none';
        if (schoolNav) schoolNav.style.display = 'none';
        if (adminNav) adminNav.style.display = 'none';

         
        const views = ['donorDashboard', 'schoolDashboard', 'adminDashboard'];
        views.forEach(id => {
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
            if (donorNav) donorNav.style.display = 'block';
            const donorDash = document.getElementById('donorDashboard');
            if (donorDash) donorDash.style.display = 'block';
            showDashboardSection('overview');
            loadUserDashboardData();
            prefillDashboardDonationForm();
        }
    }
}

function prefillDashboardDonationForm() {
    if (!currentUser) return;
    
    if(document.getElementById('dashDonorName')) document.getElementById('dashDonorName').value = currentUser.name || '';
    if(document.getElementById('dashEmail')) document.getElementById('dashEmail').value = currentUser.email || '';
    if(document.getElementById('dashOrganization')) document.getElementById('dashOrganization').value = currentUser.organization || '';
    
    if(document.getElementById('dashAddress') && currentUser.location) {
        document.getElementById('dashAddress').value = currentUser.location; 
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
    if(targetSection) targetSection.classList.add('active');
     
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
        if(document.getElementById('settingsName')) document.getElementById('settingsName').value = currentUser.name;
        if(document.getElementById('settingsEmail')) document.getElementById('settingsEmail').value = currentUser.email;
        if(document.getElementById('settingsOrganization')) document.getElementById('settingsOrganization').value = currentUser.organization;
        if(document.getElementById('settingsLocation')) document.getElementById('settingsLocation').value = currentUser.location;
    }
}

 
function logout() {
    currentUser = null;
    authToken = null;
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken');
    closeDashboard();
    showNotification('Logged out.', 'success');
    window.location.reload();
}

function handleModalClick(e) {
    if (e.target === document.getElementById('authModal')) closeAuthModal();
    if (e.target === document.getElementById('dashboardModal')) closeDashboard();
    if (e.target === document.getElementById('requestModal')) closeRequestModal();
}

function animateOnScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('fade-in-up'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.value-card, .service-card, .stat-card, .story-card, .region-card').forEach(el => observer.observe(el));
}

window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    }
});

const style = document.createElement('style');
style.textContent = `@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .notification-content { display: flex; align-items: center; gap: 12px; } .notification-close { background: none; border: none; color: inherit; cursor: pointer; padding: 4px; border-radius: 4px; transition: background-color 0.2s; } .notification-close:hover { background-color: rgba(255, 255, 255, 0.2); } .error { border-color: #ef4444 !important; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important; } .hamburger.active span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); } .hamburger.active span:nth-child(2) { opacity: 0; } .hamburger.active span:nth-child(3) { transform: rotate(-45deg) translate(7px, -6px); }`;
document.head.appendChild(style);

 

async function loadUserDashboardData() {
    if (!currentUser || !currentUser.user_id) return;

    try { 
        const response = await fetch(`${API_URL}/donations/user/${currentUser.user_id}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json(); 
            const donations = data.donations || [];
             
            updateDashboardStats(donations);
            renderDonationsTable(donations);
            renderRecentActivity(donations);
        } else {
            console.error('Failed to fetch user donations');
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateDashboardStats(donations) { 
    const totalDonationsEl = document.getElementById('dashTotalDonations');
    if (totalDonationsEl) {
        totalDonationsEl.textContent = donations.length;
    }
}

function renderDonationsTable(donations) {
    const tbody = document.getElementById('donationTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';  

    if (donations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 1rem;">No donations found yet.</td></tr>';
        return;
    }

    donations.forEach(donation => {
        const date = new Date(donation.created_at).toLocaleDateString();
        const statusClass = getStatusClass(donation.status);
        const statusLabel = donation.status.charAt(0).toUpperCase() + donation.status.slice(1);

        const row = `
            <tr>
                <td>${date}</td>
                <td style="text-transform: capitalize;">${donation.computer_type}</td>
                <td>${donation.quantity}</td>
                <td><span class="status ${statusClass}">${statusLabel}</span></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function renderRecentActivity(donations) {
    const activityList = document.getElementById('dashActivityList');
    if (!activityList) return;

    activityList.innerHTML = '';  
    const recentItems = donations.slice(0, 3);

    if (recentItems.length === 0) {
        activityList.innerHTML = '<p style="color: #6b7280; font-size: 0.9rem;">No recent activity.</p>';
        return;
    }

    recentItems.forEach(donation => {
        const date = new Date(donation.created_at).toLocaleDateString();
        
        let description = '';
        let icon = 'fa-clock';
        let iconColor = '#fef3c7'; 
        let iconTextColor = '#92400e';

        if (donation.status === 'pending') {
            description = `Submission for ${donation.quantity} ${donation.computer_type}(s) is pending approval.`;
        } else if (donation.status === 'approved') {
            icon = 'fa-check';
            iconColor = '#dcfce7'; 
            iconTextColor = '#166534';
            description = `Donation of ${donation.quantity} ${donation.computer_type}(s) has been approved.`;
        } else if (donation.status === 'delivered') {
            icon = 'fa-truck';
            iconColor = '#dbeafe'; 
            iconTextColor = '#1e40af';
            description = `Donation delivered successfully!`;
        } else {
             description = `Status update: ${donation.status}`;
        }

        const item = `
            <div class="activity-item">
                <div class="activity-icon" style="background: ${iconColor};">
                    <i class="fas ${icon}" style="color: ${iconTextColor};"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">Donation ${donation.status}</div>
                    <div class="activity-description">${description}</div>
                    <div class="activity-date">${date}</div>
                </div>
            </div>
        `;
        activityList.innerHTML += item;
    });
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
        } else {
            console.error('Failed to fetch school requests');
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
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 1rem;">No requests made yet.</td></tr>';
        return;
    }

    requests.forEach(req => {
        const date = new Date(req.created_at).toLocaleDateString();
        const statusClass = getStatusClass(req.status);
        const statusLabel = req.status.charAt(0).toUpperCase() + req.status.slice(1);
        
        const row = `
            <tr>
                <td>${date}</td>
                <td style="text-transform: capitalize;">${req.computer_type}</td>
                <td>${req.quantity}</td>
                <td><span class="status ${statusClass}">${statusLabel}</span></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function openRequestModal() {
    const modal = document.getElementById('requestModal');
    if (modal) {
        modal.style.display = 'block';
        if(currentUser) {
            const form = document.getElementById('requestForm');
            if(form) {
                if(form.querySelector('[name="school_name"]')) form.querySelector('[name="school_name"]').value = currentUser.organization || '';
                if(form.querySelector('[name="email"]')) form.querySelector('[name="email"]').value = currentUser.email || '';
                if(form.querySelector('[name="contact_person"]')) form.querySelector('[name="contact_person"]').value = currentUser.name || '';
                if(form.querySelector('[name="location"]')) form.querySelector('[name="location"]').value = currentUser.location || '';
            }
        }
    }
}

function closeRequestModal() {
    const modal = document.getElementById('requestModal');
    if (modal) modal.style.display = 'none';
}

async function handleRequestSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const requestData = Object.fromEntries(formData.entries());
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/schools/requests`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (response.ok) {
            e.target.reset();
            closeRequestModal();
            showNotification('Request submitted successfully!', 'success');
            loadSchoolDashboardData(); 
        } else {
            showNotification(result.message || 'Submission failed', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Connection error', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}
 

async function loadAdminDashboardData() { 
    try {
        const response = await fetch(`${API_URL}/stats/dashboard`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json(); 
            const pendingDonationsEl = document.getElementById('adminPendingDonations');
            const pendingRequestsEl = document.getElementById('adminPendingRequests');
            
            if (pendingDonationsEl) pendingDonationsEl.textContent = data.statistics.pending.donations || 0;
            if (pendingRequestsEl) pendingRequestsEl.textContent = data.statistics.pending.requests || 0;
        } else {
            console.error('Failed to fetch admin stats');
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
 
    loadAdminDonations();
    loadAdminRequests();
}
 
async function loadAdminDonations() {
    try { 
        const response = await fetch(`${API_URL}/donations?status=pending`, {
            headers: getAuthHeaders()
        });
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No pending donations.</td></tr>';
        return;
    }

    donations.forEach(donation => {
        const date = new Date(donation.created_at).toLocaleDateString();
        tbody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>${donation.donor_name}</td>
                <td style="text-transform: capitalize;">${donation.computer_type}</td>
                <td>${donation.quantity}</td>
                <td><span class="status ${getStatusClass(donation.status)}">${donation.status}</span></td>
                <td>
                    <button class="btn-icon approve" title="Approve" style="background-color: #dcfce7; color: #166534; border: none; padding: 6px 10px; cursor: pointer;" onclick="updateDonationStatus('${donation.id}', 'approved')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon reject" title="Reject" style="background-color: #fee2e2; color: #991b1b; border: none; padding: 6px 10px; cursor: pointer;" onclick="updateDonationStatus('${donation.id}', 'rejected')">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

async function updateDonationStatus(id, status) {
    if(!confirm(`Are you sure you want to mark this donation as ${status}?`)) return;

    try {
        const response = await fetch(`${API_URL}/donations/${id}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            showNotification(`Donation marked as ${status}`, 'success');
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
        const response = await fetch(`${API_URL}/schools/requests?status=pending`, {
            headers: getAuthHeaders()
        });
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No pending requests.</td></tr>';
        return;
    }

    requests.forEach(req => {
        const date = new Date(req.created_at).toLocaleDateString();
        tbody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>${req.school_name}</td>
                <td style="text-transform: capitalize;">${req.computer_type}</td>
                <td>${req.quantity}</td>
                <td><span class="status ${getStatusClass(req.status)}">${req.status}</span></td>
                <td>
                    <button class="btn-icon approve" title="Approve" style="background-color: #dcfce7; color: #166534; border: none; padding: 6px 10px; cursor: pointer;" onclick="updateRequestStatus('${req.id}', 'approved')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon reject" title="Reject" style="background-color: #fee2e2; color: #991b1b; border: none; padding: 6px 10px; cursor: pointer;" onclick="updateRequestStatus('${req.id}', 'rejected')">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

async function updateRequestStatus(id, status) {
    if(!confirm(`Are you sure you want to mark this request as ${status}?`)) return;

    try {
        const response = await fetch(`${API_URL}/schools/requests/${id}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            showNotification(`Request marked as ${status}`, 'success');
            loadAdminDashboardData(); 
        } else {
            showNotification('Failed to update status', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Connection error', 'error');
    }
}
 

function getStatusClass(status) {
    switch (status) {
        case 'delivered': return 'delivered'; 
        case 'approved': return 'delivered';  
        case 'fulfilled': return 'delivered';
        case 'pending': return 'processing';  
        case 'processing': return 'processing';
        case 'rejected': return 'error';      
        default: return '';
    }
}