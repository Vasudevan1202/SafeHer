import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, query, where, getDocs, addDoc, deleteDoc, serverTimestamp, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// Copyright 2026 Vasu
// SafeHer - Women Safety Application
// Main Script File

// ==================== FIREBASE INITIALIZATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyDq-9cEpG3u5EgSY-ROscG-FP40WxNXEDw",
    authDomain: "safeher1807.firebaseapp.com",
    projectId: "safeher1807",
    storageBucket: "safeher1807.firebasestorage.app",
    messagingSenderId: "110077377367",
    appId: "1:110077377367:web:e42f1bdbdea4a7acaf1c12"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// MSG91 configuration (NOTE: embedding API keys in client-side code is insecure
// for production. This is implemented per your request for a pure frontend demo.)
const MSG91_AUTH_KEY = '520745AQRjjLhis4I6a184f42P1';
const MSG91_TEMPLATE_ID = '6a184e12c2908d84b0039312';

let confirmationResult = null;
let locationWatchId = null;
let liveLocationListeners = [];
let familyConnectionUnsubscribe = null;
let currentUserLocation = null;

// ==================== STATE MANAGEMENT ====================
const appState = {
    user: {
        uid: '',
        name: '',
        phone: '',
        fullPhone: '',
        gender: '',
        role: ''
    },
    familyMembers: [],
    liveLocations: {},
    incomingRequests: [],
    outgoingRequests: [],
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

function initFirebase() {
    window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
        callback: () => {
            console.log('reCAPTCHA solved');
        }
    }, auth);

    window.recaptchaVerifier.render()
        .then(widgetId => {
            console.log('reCAPTCHA widget rendered', widgetId);
        })
        .catch(error => {
            console.error('reCAPTCHA initialization failed:', error);
        });

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('Firebase auth state changed: user signed in', user.uid);
            await loadUserProfile(user);
            await loadFamilyConnections();
            await loadPendingRequests();
            await loadOutgoingRequests();
            updateDashboard();
            initTracking();
            showScreen('home');
        } else {
            console.log('Firebase auth state changed: user signed out');
        }
    });
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

// Send OTP using MSG91 REST API
async function handleSendOtp() {
    const nameInput = document.getElementById('userName');
    const phoneInput = document.getElementById('userPhone');
    const sendOtpBtn = document.getElementById('sendOtpBtn');

    if (!nameInput || !phoneInput) return;

    const name = nameInput.value.trim();
    let phone = phoneInput.value.trim();

    // Basic validation
    if (!name) {
        showToast('Please enter your name', 'error');
        nameInput.focus();
        return;
    }

    // Normalize Indian numbers: add +91 when missing
    if (!phone) {
        showToast('Please enter your phone number', 'error');
        phoneInput.focus();
        return;
    }

    // Strip non-digits
    phone = phone.replace(/\D/g, '');
    if (phone.length < 10) {
        showToast('Please enter a valid phone number', 'error');
        phoneInput.focus();
        return;
    }

    // If user entered local 10-digit number, prefix +91
    const fullPhone = phone.startsWith('91') && phone.length >= 12 ? `+${phone}` : (phone.length === 10 ? `+91${phone}` : `+${phone}`);

    if (!appState.user.gender) {
        showToast('Please select your gender', 'error');
        return;
    }

    if (!appState.user.role) {
        showToast('Please select your role', 'error');
        return;
    }

    // Save user data locally
    appState.user.name = name;
    appState.user.phone = phone;
    appState.user.fullPhone = fullPhone;

    // UI: show loading spinner on button
    if (sendOtpBtn) {
        sendOtpBtn.classList.add('loading');
        sendOtpBtn.setAttribute('aria-busy', 'true');
    }

    try {
        // MSG91 send OTP endpoint (using legacy HTTP API)
        const url = `https://control.msg91.com/api/sendotp.php?authkey=${encodeURIComponent(MSG91_AUTH_KEY)}&mobile=${encodeURIComponent(fullPhone.replace('+',''))}&template_id=${encodeURIComponent(MSG91_TEMPLATE_ID)}`;

        const res = await fetch(url, { method: 'GET' });
        const text = await res.text();

        // MSG91 legacy API returns simple success codes / messages.
        if (!res.ok) {
            console.error('MSG91 send OTP failed', res.status, text);
            throw new Error('Failed to send OTP. Try again later.');
        }

        // Basic success detection: server returns JSON or text containing "success" or "OTP"
        if (/success|otp sent|OTP/i.test(text)) {
            showToast('OTP sent successfully!', 'success');
            // Show OTP entry UI
            document.getElementById('loginStep1').classList.remove('active');
            document.getElementById('loginStep2').classList.add('active');

            // Start resend timer
            startResendTimer(30);

            const firstOtpInput = document.querySelector('.otp-input[data-index="0"]');
            if (firstOtpInput) firstOtpInput.focus();
        } else {
            console.error('Unexpected MSG91 response:', text);
            throw new Error('Unable to send OTP. Please try again.');
        }
    } catch (error) {
        console.error('Failed to send OTP via MSG91:', error);
        showToast(error.message || 'Failed to send OTP, please try again', 'error');
    } finally {
        if (sendOtpBtn) {
            sendOtpBtn.classList.remove('loading');
            sendOtpBtn.removeAttribute('aria-busy');
        }
    }
}

// Verify OTP using MSG91
async function handleVerifyOtp() {
    const otpInputs = document.querySelectorAll('.otp-input');
    let otp = '';

    otpInputs.forEach(input => {
        otp += input.value;
    });

    if (otp.length < 4) {
        showToast('Please enter complete OTP', 'error');
        return;
    }

    if (!appState.user.fullPhone) {
        showToast('Please request OTP first', 'error');
        return;
    }

    try {
        const mobileForApi = appState.user.fullPhone.replace('+', '');
        const url = `https://control.msg91.com/api/verifyRequestOTP.php?authkey=${encodeURIComponent(MSG91_AUTH_KEY)}&mobile=${encodeURIComponent(mobileForApi)}&otp=${encodeURIComponent(otp)}`;

        const res = await fetch(url, { method: 'GET' });
        const text = await res.text();

        if (!res.ok) {
            console.error('MSG91 verify OTP error', res.status, text);
            throw new Error('OTP verification failed. Please try again.');
        }

        // Detect success in response
        if (/success|OTP verified|verified/i.test(text)) {
            showToast('Verification successful!', 'success');
            // Proceed to create or find user in Firestore and continue login flow
            const userLike = { uid: null, phone: appState.user.fullPhone };
            await handleLoginSuccess(userLike);
        } else {
            console.error('MSG91 verify unexpected response:', text);
            throw new Error('Incorrect OTP. Please try again.');
        }
    } catch (error) {
        console.error('OTP verification failed via MSG91:', error);
        showToast(error.message || 'OTP verification failed', 'error');
    }
}

function handleResendOtp() {
    // Trigger resend using same flow as initial send
    const resendBtn = document.getElementById('resendOtpBtn');
    if (!resendBtn) return;

    // Prevent clicking when disabled
    if (resendBtn.disabled) return;

    // Re-run send OTP flow using existing phone value
    const phoneInput = document.getElementById('userPhone');
    if (!phoneInput) return;

    // Show a small notice and call handleSendOtp to resend
    showToast('Resending OTP...', 'default');
    handleSendOtp();
}

// Start a resend timer to disable the resend button for `seconds` seconds
function startResendTimer(seconds) {
    const resendBtn = document.getElementById('resendOtpBtn');
    if (!resendBtn) return;

    resendBtn.disabled = true;
    resendBtn.classList.add('disabled');

    let remaining = seconds;
    resendBtn.textContent = `Resend in ${remaining}s`;

    const interval = setInterval(() => {
        remaining--;
        if (remaining > 0) {
            resendBtn.textContent = `Resend in ${remaining}s`;
        } else {
            clearInterval(interval);
            resendBtn.disabled = false;
            resendBtn.classList.remove('disabled');
            resendBtn.textContent = 'Resend OTP';
        }
    }, 1000);
}

async function handleLoginSuccess(user) {
    // If user was created via MSG91 flow, `user.uid` may be null. We'll resolve or create
    // a Firestore profile inside `saveUserToFirestore` which will set `appState.user.uid`.
    appState.user.fullPhone = user.phone || appState.user.fullPhone;
    appState.user.phone = appState.user.fullPhone ? appState.user.fullPhone.replace('+91', '') : appState.user.phone;

    await saveUserToFirestore(user.uid);
    localStorage.setItem('safeHerUser', JSON.stringify(appState.user));

    await loadFamilyConnections();
    updateDashboard();

    if (appState.safeMode) {
        startSafeModeTracking();
    }

    showScreen('home');
    showToast(`Welcome, ${appState.user.name}!`, 'success');
}

async function saveUserToFirestore(uid) {
    try {
        // If UID provided (unlikely from MSG91 flow), use it.
        if (uid) {
            const userRef = doc(db, 'users', uid);
            await setDoc(userRef, {
                name: appState.user.name,
                phone: appState.user.fullPhone,
                gender: appState.user.gender,
                role: appState.user.role,
                updatedAt: serverTimestamp()
            }, { merge: true });
            appState.user.uid = uid;
            console.log('User saved to Firestore:', uid);
            return;
        }

        // Try finding an existing user by phone
        const usersQuery = query(collection(db, 'users'), where('phone', '==', appState.user.fullPhone));
        const usersSnap = await getDocs(usersQuery);
        if (!usersSnap.empty) {
            const existingDoc = usersSnap.docs[0];
            await updateDoc(doc(db, 'users', existingDoc.id), {
                name: appState.user.name,
                gender: appState.user.gender,
                role: appState.user.role,
                updatedAt: serverTimestamp()
            });
            appState.user.uid = existingDoc.id;
            console.log('Existing user updated:', existingDoc.id);
            return;
        }

        // Create new user document
        const newUserRef = await addDoc(collection(db, 'users'), {
            name: appState.user.name,
            phone: appState.user.fullPhone,
            gender: appState.user.gender,
            role: appState.user.role,
            createdAt: serverTimestamp()
        });
        appState.user.uid = newUserRef.id;
        console.log('New user created in Firestore:', newUserRef.id);
    } catch (error) {
        console.error('Error saving user to Firestore:', error);
        showToast('Unable to save profile. Try again later.', 'error');
    }
}

async function loadUserProfile(user) {
    try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            appState.user = {
                uid: user.uid,
                name: userData.name || appState.user.name,
                phone: userData.phone ? userData.phone.replace('+91', '') : appState.user.phone,
                fullPhone: userData.phone || appState.user.fullPhone,
                gender: userData.gender || appState.user.gender,
                role: userData.role || appState.user.role
            };
            console.log('Loaded user profile from Firestore:', appState.user);
            localStorage.setItem('safeHerUser', JSON.stringify(appState.user));
        } else {
            console.log('No Firestore profile found, using local data');
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

async function loadFamilyConnections() {
    if (!appState.user.uid) return;

    try {
        const connectionsQuery = query(
            collection(db, 'familyConnections'),
            where('members', 'array-contains', appState.user.uid)
        );

        const querySnapshot = await getDocs(connectionsQuery);
        const members = [];

        for (const docSnap of querySnapshot.docs) {
            const connection = docSnap.data();
            const otherUid = connection.members.find(uid => uid !== appState.user.uid);

            if (!otherUid) continue;

            const otherUserRef = doc(db, 'users', otherUid);
            const otherUserSnap = await getDoc(otherUserRef);

            if (otherUserSnap.exists()) {
                const otherUser = otherUserSnap.data();
                members.push({
                    id: otherUid,
                    uid: otherUid,
                    name: otherUser.name,
                    phone: otherUser.phone,
                    role: otherUser.role
                });
            }
        }

        appState.familyMembers = members;
        renderFamilyMembers();
        watchLiveLocations();
    } catch (error) {
        console.error('Error loading family connections:', error);
    }
}

function watchLiveLocations() {
    liveLocationListeners.forEach(unsub => unsub());
    liveLocationListeners = [];

    const connectedIds = appState.familyMembers.map(member => member.uid);
    if (appState.user.uid && !connectedIds.includes(appState.user.uid)) {
        connectedIds.push(appState.user.uid);
    }

    connectedIds.forEach(uid => {
        const liveDoc = doc(db, 'liveLocations', uid);
        const unsubscribe = onSnapshot(liveDoc, (snapshot) => {
            if (snapshot.exists()) {
                appState.liveLocations[uid] = snapshot.data();
                renderConnectedMembers();
                updateLocationInfo();
            }
        });

        liveLocationListeners.push(unsubscribe);
    });
}

function renderConnectedMembers() {
    const connectedMembersList = document.getElementById('connectedMembersList');
    if (!connectedMembersList) return;

    if (appState.familyMembers.length === 0) {
        connectedMembersList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="19" y1="8" x2="19" y2="14"/>
                    <line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                <p>No connected family members yet</p>
            </div>
        `;
        return;
    }

    connectedMembersList.innerHTML = appState.familyMembers.map(member => {
        const live = appState.liveLocations[member.uid];
        const locationText = live ? `${live.latitude.toFixed(4)}, ${live.longitude.toFixed(4)}` : 'Waiting for location';
        const updatedAt = live && live.updatedAt ? new Date(live.updatedAt.seconds * 1000).toLocaleTimeString() : 'Pending';
        const safeModeStatus = live ? (live.safeMode ? 'ON' : 'OFF') : 'Unknown';

        return `
            <div class="member-card">
                <div class="member-details">
                    <span class="member-name">${member.name}</span>
                    <span class="member-role ${member.role}">${member.role}</span>
                </div>
                <div class="member-meta">
                    <span>${locationText}</span>
                    <span>${safeModeStatus} • ${updatedAt}</span>
                </div>
            </div>
        `;
    }).join('');
}

async function saveLiveLocation(position) {
    if (!appState.user.uid) return;

    const locationDoc = doc(db, 'liveLocations', appState.user.uid);

    try {
        await setDoc(locationDoc, {
            uid: appState.user.uid,
            name: appState.user.name,
            phone: appState.user.fullPhone,
            role: appState.user.role,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            safeMode: appState.safeMode,
            updatedAt: serverTimestamp()
        }, { merge: true });

        currentUserLocation = position.coords;
        console.log('Live location saved:', position.coords);
        updateLocationInfo();
    } catch (error) {
        console.error('Error saving live location:', error);
    }
}

function startSafeModeTracking() {
    if (!('geolocation' in navigator)) {
        showToast('Geolocation is not supported in this browser.', 'error');
        return;
    }

    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
    }

    locationWatchId = navigator.geolocation.watchPosition(
        (position) => {
            currentUserLocation = position.coords;
            saveLiveLocation(position);
            console.log('Location update:', position.coords.latitude, position.coords.longitude);
        },
        (error) => {
            console.error('Geolocation error:', error);
            showToast('Unable to access location. Please enable location services.', 'error');
        },
        {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000
        }
    );
}

function stopSafeModeTracking() {
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
        console.log('Safe Mode tracking stopped');
    }
}

function getCurrentLocationText() {
    if (currentUserLocation) {
        return `${currentUserLocation.latitude.toFixed(4)}, ${currentUserLocation.longitude.toFixed(4)}`;
    }
    return 'Waiting for GPS';
}

async function createEmergencyAlert() {
    const alertLocation = currentUserLocation ? {
        latitude: currentUserLocation.latitude,
        longitude: currentUserLocation.longitude
    } : null;

    try {
        await addDoc(collection(db, 'emergencyAlerts'), {
            userUid: appState.user.uid,
            name: appState.user.name,
            phone: appState.user.fullPhone,
            role: appState.user.role,
            safeMode: appState.safeMode,
            location: alertLocation,
            createdAt: serverTimestamp()
        });
        console.log('SOS emergency alert saved to Firestore');
        showToast('Emergency Alert Sent', 'error');
    } catch (error) {
        console.error('Error creating emergency alert:', error);
        showToast('Unable to send emergency alert', 'error');
    }
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
                startSafeModeTracking();
                showToast('Safe Mode activated', 'success');
                console.log('Safe Mode activated');
            } else {
                stopSafeModeTracking();
                showToast('Safe Mode deactivated', 'error');
                console.log('Safe Mode deactivated');
            }
        });

        if (appState.safeMode) {
            startSafeModeTracking();
        }
    }

    // SOS Button
    if (sosButton) {
        // Add pulse animation
        sosButton.classList.add('pulse');

        sosButton.addEventListener('click', handleSosClick);
    }
}

async function handleSosClick() {
    const confirmEmergency = confirm('Are you sure you want to trigger emergency alert?');

    if (confirmEmergency) {
        triggerEmergency();
        await createEmergencyAlert();
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

    loadPendingRequests();
    loadOutgoingRequests();
}

async function handleAddFamily() {
    const phoneInput = document.getElementById('familyPhone');
    if (!phoneInput) return;

    const phone = phoneInput.value.trim();
    const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    if (!phone || phone.length < 10) {
        showToast('Please enter a valid phone number', 'error');
        return;
    }

    if (!appState.user.uid) {
        showToast('You must be logged in to add family members', 'error');
        return;
    }

    const exists = appState.familyMembers.some(m => m.phone === fullPhone);
    if (exists) {
        showToast('Family member already added', 'error');
        return;
    }

    try {
        const duplicateQuery = query(
            collection(db, 'familyRequests'),
            where('senderPhone', '==', appState.user.fullPhone),
            where('receiverPhone', '==', fullPhone),
            where('status', '==', 'pending')
        );
        const duplicateSnapshot = await getDocs(duplicateQuery);

        if (!duplicateSnapshot.empty) {
            showToast('A connection request is already pending', 'error');
            return;
        }

        await addDoc(collection(db, 'familyRequests'), {
            senderUid: appState.user.uid,
            senderPhone: appState.user.fullPhone,
            receiverPhone: fullPhone,
            senderRole: appState.user.role,
            status: 'pending',
            timestamp: serverTimestamp()
        });

        phoneInput.value = '';
        showToast('Connection request sent', 'success');
        await loadPendingRequests();
        await loadOutgoingRequests();
    } catch (error) {
        console.error('Error sending family request:', error);
        showToast('Unable to send connection request', 'error');
    }
}

async function loadPendingRequests() {
    const requestsList = document.getElementById('requestsList');
    if (!appState.user.fullPhone || !requestsList) return;

    try {
        const pendingQuery = query(
            collection(db, 'familyRequests'),
            where('receiverPhone', '==', appState.user.fullPhone),
            where('status', '==', 'pending')
        );
        const snapshot = await getDocs(pendingQuery);
        appState.incomingRequests = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        renderPendingRequests();
    } catch (error) {
        console.error('Error loading pending requests:', error);
    }
}

async function loadOutgoingRequests() {
    const outgoingContainer = document.getElementById('outgoingRequestsList');
    if (!appState.user.fullPhone || !outgoingContainer) return;

    try {
        const outgoingQuery = query(
            collection(db, 'familyRequests'),
            where('senderPhone', '==', appState.user.fullPhone)
        );
        const snapshot = await getDocs(outgoingQuery);
        appState.outgoingRequests = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        renderOutgoingRequests();
    } catch (error) {
        console.error('Error loading outgoing requests:', error);
    }
}

function renderPendingRequests() {
    const requestsList = document.getElementById('requestsList');
    if (!requestsList) return;

    if (appState.incomingRequests.length === 0) {
        requestsList.innerHTML = `
            <div class="empty-state">
                <p>No pending requests</p>
            </div>
        `;
        return;
    }

    requestsList.innerHTML = appState.incomingRequests.map(request => `
        <div class="request-card fade-in">
            <div class="request-info">
                <div>
                    <p class="request-title">Connection request from <strong>${request.senderPhone}</strong></p>
                    <p class="request-meta">Role: ${request.senderRole || 'Unknown'}</p>
                </div>
                <span class="status-pill pending">Pending</span>
            </div>
            <div class="request-actions">
                <button class="accept-btn" onclick="acceptFamilyRequest('${request.id}')">Accept</button>
                <button class="reject-btn" onclick="rejectFamilyRequest('${request.id}')">Reject</button>
            </div>
        </div>
    `).join('');
}

function renderOutgoingRequests() {
    const outgoingContainer = document.getElementById('outgoingRequestsList');
    if (!outgoingContainer) return;

    if (appState.outgoingRequests.length === 0) {
        outgoingContainer.innerHTML = `
            <div class="empty-state">
                <p>No outgoing requests</p>
            </div>
        `;
        return;
    }

    outgoingContainer.innerHTML = appState.outgoingRequests.map(request => `
        <div class="request-card fade-in">
            <div class="request-info">
                <div>
                    <p class="request-title">Request to <strong>${request.receiverPhone}</strong></p>
                    <p class="request-meta">Role: ${request.senderRole || 'Unknown'}</p>
                </div>
                <span class="status-pill ${request.status}">${request.status}</span>
            </div>
        </div>
    `).join('');
}

async function acceptFamilyRequest(requestId) {
    try {
        const requestRef = doc(db, 'familyRequests', requestId);
        const requestSnap = await getDoc(requestRef);
        if (!requestSnap.exists()) {
            showToast('Request not found', 'error');
            return;
        }

        const requestData = requestSnap.data();
        if (requestData.status !== 'pending') {
            showToast('Request is no longer pending', 'error');
            await loadPendingRequests();
            return;
        }

        await updateDoc(requestRef, { status: 'accepted' });

        const senderQuery = query(collection(db, 'users'), where('phone', '==', requestData.senderPhone));
        const senderSnapshot = await getDocs(senderQuery);
        if (senderSnapshot.empty) {
            showToast('Sender profile not found', 'error');
            return;
        }

        const senderUid = senderSnapshot.docs[0].id;
        await addDoc(collection(db, 'familyConnections'), {
            members: [appState.user.uid, senderUid],
            createdAt: serverTimestamp()
        });

        console.log('Family connection created for request:', requestId);
        showToast('Connection accepted', 'success');
        await loadFamilyConnections();
        await loadPendingRequests();
        await loadOutgoingRequests();
    } catch (error) {
        console.error('Error accepting request:', error);
        showToast('Unable to accept request', 'error');
    }
}

async function rejectFamilyRequest(requestId) {
    try {
        const requestRef = doc(db, 'familyRequests', requestId);
        await updateDoc(requestRef, { status: 'rejected' });
        showToast('Request rejected', 'success');
        await loadPendingRequests();
        await loadOutgoingRequests();
    } catch (error) {
        console.error('Error rejecting request:', error);
        showToast('Unable to reject request', 'error');
    }
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
            <button class="remove-family-btn" onclick="removeFamilyMember('${member.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `).join('');
}

async function removeFamilyMember(id) {
    const index = appState.familyMembers.findIndex(m => m.id === id);
    if (index > -1) {
        const member = appState.familyMembers[index];

        try {
            const connectionQuery = query(
                collection(db, 'familyConnections'),
                where('members', 'array-contains', appState.user.uid)
            );
            const connectionSnapshot = await getDocs(connectionQuery);

            for (const docSnap of connectionSnapshot.docs) {
                const connection = docSnap.data();
                if (connection.members.includes(member.uid)) {
                    await deleteDoc(doc(db, 'familyConnections', docSnap.id));
                }
            }
        } catch (error) {
            console.error('Error removing family connection:', error);
        }

        appState.familyMembers.splice(index, 1);
        renderFamilyMembers();
        showToast('Family member removed', 'success');
    }
}

// ==================== TRACKING ====================

function initTracking() {
    updateLocationInfo();
    watchLiveLocations();
}

function updateLocationInfo() {
    const currentLocation = document.getElementById('currentLocation');
    const eta = document.getElementById('eta');
    const locationStatus = document.getElementById('locationStatus');

    if (currentLocation) {
        currentLocation.textContent = getCurrentLocationText();
    }

    if (eta) {
        eta.textContent = appState.safeMode ? 'Live tracking on' : 'Tracking paused';
    }

    if (locationStatus) {
        locationStatus.textContent = appState.safeMode ? 'Protection Active' : 'Protection Disabled';
        locationStatus.classList.toggle('active', appState.safeMode);
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

async function handleLogout() {
    const confirmLogout = confirm('Are you sure you want to logout?');

    if (confirmLogout) {
        try {
            await signOut(auth);
            console.log('User signed out of Firebase');
        } catch (error) {
            console.error('Error signing out:', error);
        }

        stopSafeModeTracking();
        liveLocationListeners.forEach(unsub => unsub());
        liveLocationListeners = [];

        localStorage.removeItem('safeHerUser');
        appState.user = { uid: '', name: '', phone: '', fullPhone: '', gender: '', role: '' };
        appState.familyMembers = [];
        appState.liveLocations = {};

        const userName = document.getElementById('userName');
        const userPhone = document.getElementById('userPhone');
        if (userName) userName.value = '';
        if (userPhone) userPhone.value = '';

        document.getElementById('loginStep1').classList.add('active');
        document.getElementById('loginStep2').classList.remove('active');

        document.querySelectorAll('.otp-input').forEach(input => input.value = '');
        document.querySelectorAll('.selection-btn').forEach(btn => btn.classList.remove('active'));

        showToast('Logged out successfully', 'success');

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
    initFirebase();

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
window.acceptFamilyRequest = acceptFamilyRequest;
window.rejectFamilyRequest = rejectFamilyRequest;

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