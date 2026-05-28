// Copyright 2026 Vasu
// SafeHer - Women Safety Application
// Main Script File

// ==================== STATE MANAGEMENT ====================
const appState = {
    user: {
        name: '',
        phone: '',
        gender: '',
        role: ''
    },
    familyMembers: [],
    emergencyContacts: [
        { name: 'Mom', phone: '+91 9876543210' },
        { name: 'Dad', phone: '+91 9876543211' }
    ],
    safeMode: true,
    darkMode: false,
    emergencyActive: false,
    emergencyTimer: null
};

// ==================== UTILITY FUNCTIONS ====================

// Show toast notification
function showToast(message, type = 'default') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.className = `toast ${type} active`;

    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}

// Show specific screen
function showScreen(screenName) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    // Show target screen
    const targetScreen = document.getElementById(`${screenName}Screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    // Update navigation
    updateNavigation(screenName);

    // Show/hide bottom nav based on screen
    const bottomNav = document.getElementById('bottomNav');
    if (['login', 'splash'].includes(screenName)) {
        bottomNav.classList.add('hidden');
    } else {
        bottomNav.classList.remove('hidden');
    }
}

// Update navigation active state
function updateNavigation(screenName) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const screen = item.getAttribute('data-screen');
        if (screen === screenName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// ==================== SPLASH SCREEN ====================

function initSplash() {
    setTimeout(() => {
        const splashScreen = document.getElementById('splashScreen');
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                showScreen('login');
            }, 500);
        }
    }, 3000); // Show splash for 3 seconds
}

// ==================== LOGIN FUNCTIONALITY ====================

function initLogin() {
    const genderButtons = document.querySelectorAll('[data-gender]');
    const roleButtons = document.querySelectorAll('[data-role]');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const resendOtpBtn = document.getElementById('resendOtpBtn');
    const otpInputs = document.querySelectorAll('.otp-input');

    // Gender selection
    genderButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            genderButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.user.gender = btn.getAttribute('data-gender');
        });
    });

    // Role selection
    roleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            roleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.user.role = btn.getAttribute('data-role');
        });
    });

    // Send OTP
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', handleSendOtp);
    }

    // OTP input handling
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });

        // Only allow numbers
        input.addEventListener('keypress', (e) => {
            if (!/\d/.test(e.key)) {
                e.preventDefault();
            }
        });
    });

    // Verify OTP
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', handleVerifyOtp);
    }

    // Resend OTP
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', handleResendOtp);
    }
}

function handleSendOtp() {
    const nameInput = document.getElementById('userName');
    const phoneInput = document.getElementById('userPhone');

    if (!nameInput || !phoneInput) return;

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    // Validation
    if (!name) {
        showToast('Please enter your name', 'error');
        nameInput.focus();
        return;
    }

    if (!phone || phone.length < 10) {
        showToast('Please enter a valid phone number', 'error');
        phoneInput.focus();
        return;
    }

    if (!appState.user.gender) {
        showToast('Please select your gender', 'error');
        return;
    }

    if (!appState.user.role) {
        showToast('Please select your role', 'error');
        return;
    }

    // Save user data
    appState.user.name = name;
    appState.user.phone = phone;

    // Simulate OTP sending
    showToast('OTP sent successfully!', 'success');

    // Move to OTP step
    setTimeout(() => {
        document.getElementById('loginStep1').classList.remove('active');
        document.getElementById('loginStep2').classList.add('active');

        // Focus first OTP input
        const firstOtpInput = document.querySelector('.otp-input[data-index="0"]');
        if (firstOtpInput) firstOtpInput.focus();

        // Demo: Fill OTP automatically (123456)
        setTimeout(() => {
            const otpInputs = document.querySelectorAll('.otp-input');
            otpInputs.forEach((input, index) => {
                setTimeout(() => {
                    input.value = index + 1;
                    input.dispatchEvent(new Event('input'));
                }, index * 100);
            });
        }, 500);
    }, 1000);
}

function handleVerifyOtp() {
    const otpInputs = document.querySelectorAll('.otp-input');
    let otp = '';

    otpInputs.forEach(input => {
        otp += input.value;
    });

    if (otp.length !== 6) {
        showToast('Please enter complete OTP', 'error');
        return;
    }

    // Simulate OTP verification (always success for demo)
    showToast('Verification successful!', 'success');

    // Save user data to localStorage
    localStorage.setItem('safeHerUser', JSON.stringify(appState.user));

    setTimeout(() => {
        // Navigate to home
        showScreen('home');

        // Update dashboard
        updateDashboard();

        showToast(`Welcome, ${appState.user.name}!`, 'success');
    }, 1000);
}

function handleResendOtp() {
    showToast('OTP resent successfully!', 'success');

    // Clear OTP inputs
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach(input => {
        input.value = '';
    });

    // Focus first input
    if (otpInputs[0]) otpInputs[0].focus();

    // Demo: auto fill again
    setTimeout(() => {
        otpInputs.forEach((input, index) => {
            setTimeout(() => {
                input.value = index + 1;
                input.dispatchEvent(new Event('input'));
            }, index * 100);
        });
    }, 500);
}

// ==================== HOME DASHBOARD ====================

function updateDashboard() {
    // Update user name
    const dashboardUserName = document.getElementById('dashboardUserName');
    const settingsUserName = document.getElementById('settingsUserName');
    const settingsUserPhone = document.getElementById('settingsUserPhone');

    if (dashboardUserName) {
        dashboardUserName.textContent = appState.user.name || 'User';
    }

    if (settingsUserName) {
        settingsUserName.textContent = appState.user.name || 'User Name';
    }

    if (settingsUserPhone) {
        settingsUserPhone.textContent = `+91 ${appState.user.phone || 'XXXXXXXXXX'}`;
    }

    // Update safe mode status
    updateSafeModeStatus();

    // Update battery level (simulated)
    updateBatteryLevel();
}

function updateSafeModeStatus() {
    const safeModeStatus = document.getElementById('safeModeStatus');
    const safeModeCard = document.querySelector('.safe-mode-card');
    const statusIcon = document.querySelector('.status-icon');

    if (!safeModeStatus) return;

    if (appState.safeMode) {
        safeModeStatus.textContent = 'Activated';
        safeModeStatus.style.color = '#059669';
        if (safeModeCard) {
            safeModeCard.style.borderColor = '#10b981';
            safeModeCard.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
        }
        if (statusIcon) {
            statusIcon.classList.add('safe');
            statusIcon.classList.remove('warning');
        }
    } else {
        safeModeStatus.textContent = 'Deactivated';
        safeModeStatus.style.color = '#d97706';
        if (safeModeCard) {
            safeModeCard.style.borderColor = '#f59e0b';
            safeModeCard.style.background = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
        }
        if (statusIcon) {
            statusIcon.classList.add('warning');
            statusIcon.classList.remove('safe');
        }
    }
}

function updateBatteryLevel() {
    const batteryLevel = document.getElementById('batteryLevel');
    if (batteryLevel) {
        // Simulated battery level
        const level = Math.floor(Math.random() * 30 + 70);
        batteryLevel.textContent = `${level}%`;
    }
}

function initHome() {
    const safeModeToggle = document.getElementById('safeModeToggle');
    const sosButton = document.getElementById('sosButton');

    // Safe Mode Toggle
    if (safeModeToggle) {
        safeModeToggle.checked = appState.safeMode;

        safeModeToggle.addEventListener('change', () => {
            appState.safeMode = safeModeToggle.checked;
            updateSafeModeStatus();

            if (appState.safeMode) {
                showToast('Safe Mode activated', 'success');
            } else {
                showToast('Safe Mode deactivated', 'error');
            }
        });
    }

    // SOS Button
    if (sosButton) {
        // Add pulse animation
        sosButton.classList.add('pulse');

        sosButton.addEventListener('click', handleSosClick);
    }
}

function handleSosClick() {
    const confirmEmergency = confirm('Are you sure you want to trigger emergency alert?');

    if (confirmEmergency) {
        triggerEmergency();
    }
}

function triggerEmergency() {
    appState.emergencyActive = true;
    showScreen('emergency');
    startEmergencyTimer();
    showToast('Emergency alert activated!', 'error');
}

function startEmergencyTimer() {
    let seconds = 30;
    const timerDisplay = document.getElementById('countdownTimer');
    const timerProgress = document.getElementById('timerProgress');

    if (!timerDisplay || !timerProgress) return;

    const totalSeconds = 30;
    const circumference = 2 * Math.PI * 90; // radius = 90

    // Clear any existing timer
    if (appState.emergencyTimer) {
        clearInterval(appState.emergencyTimer);
    }

    appState.emergencyTimer = setInterval(() => {
        seconds--;

        // Update display
        timerDisplay.textContent = seconds;

        // Update progress circle
        const progress = (seconds / totalSeconds) * circumference;
        timerProgress.style.strokeDashoffset = circumference - progress;

        if (seconds <= 0) {
            clearInterval(appState.emergencyTimer);
            // Emergency response actions would go here
            showToast('Emergency services have been notified', 'success');
        }
    }, 1000);
}

function initEmergency() {
    const cancelEmergencyBtn = document.getElementById('cancelEmergencyBtn');

    if (cancelEmergencyBtn) {
        cancelEmergencyBtn.addEventListener('click', cancelEmergency);
    }
}

function cancelEmergency() {
    if (appState.emergencyTimer) {
        clearInterval(appState.emergencyTimer);
    }

    appState.emergencyActive = false;
    showToast('Emergency cancelled', 'success');
    showScreen('home');
}

// ==================== FAMILY CONNECTIONS ====================

function initFamily() {
    const addFamilyBtn = document.getElementById('addFamilyBtn');
    const familyPhoneInput = document.getElementById('familyPhone');

    if (addFamilyBtn) {
        addFamilyBtn.addEventListener('click', handleAddFamily);
    }

    if (familyPhoneInput) {
        familyPhoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleAddFamily();
            }
        });
    }
}

function handleAddFamily() {
    const phoneInput = document.getElementById('familyPhone');
    if (!phoneInput) return;

    const phone = phoneInput.value.trim();

    if (!phone || phone.length < 10) {
        showToast('Please enter a valid phone number', 'error');
        return;
    }

    // Check if already added
    const exists = appState.familyMembers.some(m => m.phone === phone);
    if (exists) {
        showToast('Family member already added', 'error');
        return;
    }

    // Add new family member
    const newMember = {
        id: Date.now(),
        name: `Member ${appState.familyMembers.length + 1}`,
        phone: phone,
        role: appState.user.role === 'parent' ? 'child' : 'parent'
    };

    appState.familyMembers.push(newMember);
    renderFamilyMembers();
    phoneInput.value = '';

    showToast('Family member added successfully!', 'success');
}

function renderFamilyMembers() {
    const familyList = document.getElementById('familyList');
    if (!familyList) return;

    if (appState.familyMembers.length === 0) {
        familyList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="19" y1="8" x2="19" y2="14"/>
                    <line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                <p>No family members added yet</p>
            </div>
        `;
        return;
    }

    familyList.innerHTML = appState.familyMembers.map(member => `
        <div class="family-card slide-in" data-id="${member.id}">
            <div class="family-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
            </div>
            <div class="family-info">
                <span class="family-name">${member.name}</span>
                <span class="family-role ${member.role}">${member.role}</span>
            </div>
            <button class="remove-family-btn" onclick="removeFamilyMember(${member.id})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `).join('');
}

function removeFamilyMember(id) {
    const index = appState.familyMembers.findIndex(m => m.id === id);
    if (index > -1) {
        appState.familyMembers.splice(index, 1);
        renderFamilyMembers();
        showToast('Family member removed', 'success');
    }
}

// ==================== TRACKING ====================

function initTracking() {
    updateLocationInfo();
}

function updateLocationInfo() {
    const currentLocation = document.getElementById('currentLocation');
    const eta = document.getElementById('eta');

    if (currentLocation) {
        // Simulated location
        setTimeout(() => {
            currentLocation.textContent = 'Main Street, City Center';
        }, 1000);
    }

    if (eta) {
        // Simulated ETA
        setTimeout(() => {
            eta.textContent = '15 min';
        }, 1500);
    }
}

// ==================== SETTINGS ====================

function initSettings() {
    const notificationToggle = document.getElementById('notificationToggle');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const logoutBtn = document.getElementById('logoutBtn');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const addContactBtn = document.getElementById('addContactBtn');

    // Notification toggle
    if (notificationToggle) {
        notificationToggle.addEventListener('change', () => {
            if (notificationToggle.checked) {
                showToast('Notifications enabled', 'success');
            } else {
                showToast('Notifications disabled', 'error');
            }
        });
    }

    // Dark Mode toggle
    if (darkModeToggle) {
        // Check saved preference
        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedDarkMode === 'true') {
            darkModeToggle.checked = true;
            document.body.classList.add('dark-mode');
            appState.darkMode = true;
        }

        darkModeToggle.addEventListener('change', () => {
            appState.darkMode = darkModeToggle.checked;
            localStorage.setItem('darkMode', appState.darkMode);

            if (appState.darkMode) {
                document.body.classList.add('dark-mode');
                showToast('Dark mode enabled', 'success');
            } else {
                document.body.classList.remove('dark-mode');
                showToast('Dark mode disabled', 'success');
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Save Profile
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', handleSaveProfile);
    }

    // Add Contact
    if (addContactBtn) {
        addContactBtn.addEventListener('click', handleAddContact);
    }

    // Render emergency contacts
    renderEmergencyContacts();
}

function showSettingsSection(section) {
    // Hide all sections first
    hideSettingsSections();

    // Show target section
    const sectionElement = document.getElementById(`${section}Section`);
    if (sectionElement) {
        sectionElement.classList.remove('hidden');
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function hideSettingsSections() {
    const sections = document.querySelectorAll('.settings-section');
    sections.forEach(section => {
        section.classList.add('hidden');
    });
}

function handleSaveProfile() {
    const editName = document.getElementById('editName');
    const editPhone = document.getElementById('editPhone');

    if (!editName || !editPhone) return;

    const name = editName.value.trim();
    const phone = editPhone.value.trim();

    if (name) {
        appState.user.name = name;
    }

    if (phone && phone.length >= 10) {
        appState.user.phone = phone;
    }

    // Save to localStorage
    localStorage.setItem('safeHerUser', JSON.stringify(appState.user));

    // Update UI
    updateDashboard();

    showToast('Profile updated successfully!', 'success');
    hideSettingsSections();
}

function renderEmergencyContacts() {
    const contactsList = document.getElementById('emergencyContactsList');
    if (!contactsList) return;

    contactsList.innerHTML = appState.emergencyContacts.map((contact, index) => `
        <div class="contact-card" data-index="${index}">
            <div class="contact-info">
                <span class="contact-name">${contact.name}</span>
                <span class="contact-phone">${contact.phone}</span>
            </div>
            <button class="remove-contact-btn" onclick="removeContact(${index})">&times;</button>
        </div>
    `).join('');
}

function handleAddContact() {
    const name = prompt('Enter contact name:');
    const phone = prompt('Enter phone number:');

    if (name && phone) {
        appState.emergencyContacts.push({ name, phone });
        renderEmergencyContacts();
        showToast('Contact added successfully!', 'success');
    }
}

function removeContact(index) {
    if (index > -1 && index < appState.emergencyContacts.length) {
        appState.emergencyContacts.splice(index, 1);
        renderEmergencyContacts();
        showToast('Contact removed', 'success');
    }
}

function handleLogout() {
    const confirmLogout = confirm('Are you sure you want to logout?');

    if (confirmLogout) {
        // Clear data
        localStorage.removeItem('safeHerUser');
        appState.user = { name: '', phone: '', gender: '', role: '' };
        appState.familyMembers = [];

        // Clear inputs
        const userName = document.getElementById('userName');
        const userPhone = document.getElementById('userPhone');
        if (userName) userName.value = '';
        if (userPhone) userPhone.value = '';

        // Reset login steps
        document.getElementById('loginStep1').classList.add('active');
        document.getElementById('loginStep2').classList.remove('active');

        // Clear OTP inputs
        document.querySelectorAll('.otp-input').forEach(input => input.value = '');

        // Clear gender/role selection
        document.querySelectorAll('.selection-btn').forEach(btn => btn.classList.remove('active'));

        showToast('Logged out successfully', 'success');

        // Go to login
        setTimeout(() => {
            showScreen('login');
        }, 1000);
    }
}

// ==================== NAVIGATION ====================

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const screenName = item.getAttribute('data-screen');
            if (screenName) {
                showScreen(screenName);
            }
        });
    });
}

// ==================== APP INITIALIZATION ====================

function initApp() {
    // Check for saved user data
    const savedUser = localStorage.getItem('safeHerUser');

    if (savedUser) {
        try {
            appState.user = JSON.parse(savedUser);
        } catch (e) {
            console.error('Error parsing saved user data');
        }
    }

    // Initialize all modules
    initSplash();
    initLogin();
    initHome();
    initFamily();
    initTracking();
    initEmergency();
    initSettings();
    initNavigation();

    // Determine initial screen
    if (appState.user.name && appState.user.phone) {
        // User already logged in
        setTimeout(() => {
            showScreen('home');
            updateDashboard();
        }, 100);
    } else {
        // New user - start with splash
        setTimeout(() => {
            showScreen('splash');
        }, 100);
    }
}

// ==================== GLOBAL FUNCTIONS ====================

// Make functions available globally for onclick handlers
window.showScreen = showScreen;
window.showSettingsSection = showSettingsSection;
window.hideSettingsSections = hideSettingsSections;
window.removeFamilyMember = removeFamilyMember;
window.removeContact = removeContact;

// ==================== START APPLICATION ====================

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Service Worker Registration (for PWA capability)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker would be registered here for production
        console.log('SafeHer App Ready');
    });
}

// Prevent accidental app close during emergency
window.addEventListener('beforeunload', (e) => {
    if (appState.emergencyActive) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden && appState.emergencyActive) {
        // Keep emergency active in background
        console.log('Emergency still active in background');
    }
});

// Battery API (if available)
if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
        const updateBattery = () => {
            const batteryLevel = document.getElementById('batteryLevel');
            if (batteryLevel) {
                const level = Math.round(battery.level * 100);
                batteryLevel.textContent = `${level}%`;

                // Add color coding based on battery level
                if (level <= 20) {
                    batteryLevel.style.color = '#ef4444';
                } else if (level <= 50) {
                    batteryLevel.style.color = '#f59e0b';
                } else {
                    batteryLevel.style.color = '';
                }
            }
        };

        battery.addEventListener('levelchange', updateBattery);
        updateBattery();
    });
}

// Geolocation (if available)
function updateGeolocation() {
    if ('geolocation' in navigator) {
        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log('Location updated:', latitude, longitude);
                // In production, this would update the map and share location
            },
            (error) => {
                console.log('Geolocation error:', error.message);
            },
            options
        );
    }
}

// Periodically update location when safe mode is on
setInterval(() => {
    if (appState.safeMode && appState.user.name) {
        updateGeolocation();
    }
}, 60000); // Update every minute