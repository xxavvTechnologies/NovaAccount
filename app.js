let auth;

async function updateUI() {
    const user = auth.currentUser;
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="profile-section">
            <h1>Welcome, ${user.displayName || 'User'}</h1>
            
            <div class="card">
                <h2>Profile</h2>
                <p>Email: ${user.email}</p>
                <p>Last login: ${new Date(user.metadata.lastSignInTime).toLocaleDateString()}</p>
            </div>

            <div class="card">
                <h2>Security Settings</h2>
                <p>Email verification: ${user.emailVerified ? 'Verified' : 'Not verified'}</p>
                <button class="btn" onclick="updatePassword()">Change Password</button>
            </div>
        </div>
    `;
}

function showLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.style.display = 'block';
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'signup.html';
        });
    });
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

async function trackLoginAttempt(userId, success) {
    try {
        const now = firebase.firestore.Timestamp.now();
        await db.collection('loginAttempts').add({
            userId,
            timestamp: now,
            success,
            deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            }
        });

        // Clean up old attempts (keep last 50)
        const oldAttempts = await db.collection('loginAttempts')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(51)
            .get();

        if (oldAttempts.size > 50) {
            const lastDoc = oldAttempts.docs[50];
            await db.collection('loginAttempts')
                .where('userId', '==', userId)
                .where('timestamp', '<=', lastDoc.data().timestamp)
                .get()
                .then(snapshot => {
                    snapshot.forEach(doc => doc.ref.delete());
                });
        }
    } catch (error) {
        console.error('Error tracking login attempt:', error);
    }
}

async function checkAccountLock(userId) {
    try {
        const recentAttempts = await db.collection('loginAttempts')
            .where('userId', '==', userId)
            .where('success', '==', false)
            .where('timestamp', '>=', firebase.firestore.Timestamp.fromMillis(Date.now() - LOCKOUT_DURATION))
            .get();

        return recentAttempts.size >= MAX_LOGIN_ATTEMPTS;
    } catch (error) {
        console.error('Error checking account lock:', error);
        return false;
    }
}

async function createSession() {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const sessionRef = await db.collection('sessions').add({
            userId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
            deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            }
        });

        localStorage.setItem('sessionId', sessionRef.id);
        return sessionRef.id;
    } catch (error) {
        console.error('Error creating session:', error);
        return null;
    }
}

async function updateSessionActivity() {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) return;

    try {
        await db.collection('sessions').doc(sessionId).update({
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating session:', error);
    }
}

async function logActivity(action, details = {}) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await db.collection('activityLogs').add({
            userId: user.uid,
            action,
            details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            }
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

async function updatePrivacySettings(settings) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await db.collection('users').doc(user.uid).update({
            privacySettings: {
                ...settings,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        });
        await logActivity('privacy_settings_updated', { settings });
        notifications.success('Privacy settings updated');
    } catch (error) {
        console.error('Error updating privacy settings:', error);
        notifications.error('Failed to update privacy settings');
    }
}

const rateLimits = new Map();

function checkRateLimit(action, limit = 5, window = 60000) {
    const now = Date.now();
    const key = `${auth.currentUser?.uid}-${action}`;
    const attempts = rateLimits.get(key) || [];
    
    const validAttempts = attempts.filter(time => now - time < window);
    
    if (validAttempts.length >= limit) {
        return false;
    }
    
    validAttempts.push(now);
    rateLimits.set(key, validAttempts);
    return true;
}

async function updatePassword() {
    if (!checkRateLimit('password_reset', 2, 300000)) {
        notifications.error('Too many attempts. Please try again later.');
        return;
    }

    try {
        await auth.sendPasswordResetEmail(auth.currentUser.email);
        await logActivity('password_reset_requested');
        notifications.success('Password reset email sent!');
    } catch (err) {
        console.error('Error:', err);
        notifications.error('Failed to send password reset email');
    }
}

async function loadSecurityData() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Update last password change
        const userData = await db.collection('users').doc(user.uid).get();
        const lastPasswordChange = userData.data()?.lastPasswordChange || user.metadata.creationTime;
        document.getElementById('passwordLastChanged').textContent = 
            new Date(lastPasswordChange).toLocaleDateString();

        // Load login activity
        const loginActivity = await db.collection('activityLogs')
            .where('userId', '==', user.uid)
            .where('action', '==', 'login')
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();

        const activityHTML = loginActivity.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="activity-item">
                    <div class="activity-info">
                        <div>${data.deviceInfo?.browser || 'Unknown browser'}</div>
                        <p class="text-secondary">${data.deviceInfo?.platform || 'Unknown device'}</p>
                    </div>
                    <div class="text-secondary">
                        ${new Date(data.timestamp.toDate()).toLocaleString()}
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('loginActivity').innerHTML = activityHTML || 
            '<p class="text-secondary">No recent activity</p>';

    } catch (error) {
        console.error('Error loading security data:', error);
        notifications.error('Failed to load security data');
    }
}

async function loadProfileData() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        // Update member since date
        document.getElementById('memberSince').textContent = 
            new Date(user.metadata.creationTime).toLocaleDateString();

        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.displayName) {
                document.getElementById('displayName').value = data.displayName;
                document.getElementById('userName').textContent = data.displayName;
            }
            if (data.photoURL) {
                document.getElementById('profilePhoto').src = data.photoURL;
            }
        }

        // Load active sessions
        const sessions = await db.collection('sessions')
            .where('userId', '==', user.uid)
            .where('active', '==', true)
            .get();

        const deviceListHTML = sessions.docs.map(doc => {
            const session = doc.data();
            return `
                <div class="device-item">
                    <div class="device-info">
                        <h3>${session.deviceInfo?.browser || 'Unknown browser'}</h3>
                        <p class="text-secondary">${session.deviceInfo?.platform || 'Unknown device'}</p>
                    </div>
                    <button class="btn-secondary" onclick="revokeSession('${doc.id}')">Revoke</button>
                </div>
            `;
        }).join('');

        document.getElementById('deviceList').innerHTML = deviceListHTML || 
            '<p class="text-secondary">No active sessions</p>';

    } catch (error) {
        console.error('Error loading profile:', error);
        notifications.error('Failed to load profile data');
    }
}

async function setup2FA() {
    try {
        await requireReauth();
        // Redirect to 2FA setup page
        window.location.href = '2fa-setup.html';
    } catch (error) {
        notifications.error('Failed to initiate 2FA setup');
    }
}

async function revokeSession(sessionId) {
    try {
        await requireReauth();
        await db.collection('sessions').doc(sessionId).update({
            active: false,
            revokedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        notifications.success('Session revoked successfully');
        loadProfileData(); // Reload sessions list
    } catch (error) {
        notifications.error('Failed to revoke session');
    }
}

async function loadConnectedApps() {
    const user = auth.currentUser;
    const appsContainer = document.getElementById('connectedApps');
    
    try {
        const apps = await db.collection('userApps')
            .where('userId', '==', user.uid)
            .get();

        if (apps.empty) {
            appsContainer.innerHTML = '<p class="text-secondary">No connected applications</p>';
            return;
        }

        const appsHTML = apps.docs.map(doc => {
            const app = doc.data();
            return `
                <div class="app-card">
                    <div class="app-card-header">
                        <img src="${app.iconUrl}" alt="${app.name}" class="app-icon">
                        <div>
                            <h3>${app.name}</h3>
                            <p class="text-secondary">Connected ${new Date(app.connectedAt.toDate()).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <button class="btn-secondary" onclick="revokeAppAccess('${doc.id}')">Disconnect</button>
                </div>
            `;
        }).join('');

        appsContainer.innerHTML = appsHTML;
    } catch (error) {
        console.error('Error loading apps:', error);
        notifications.error('Failed to load connected applications');
    }
}

async function revokeAppAccess(appId) {
    if (!confirm('Are you sure you want to disconnect this application?')) return;
    
    try {
        await db.collection('userApps').doc(appId).delete();
        notifications.success('Application disconnected successfully');
        loadConnectedApps();
    } catch (error) {
        console.error('Error revoking app:', error);
        notifications.error('Failed to disconnect application');
    }
}

async function loadRecentActivity() {
    const user = auth.currentUser;
    const activityContainer = document.getElementById('loginActivity');
    
    try {
        const activities = await db.collection('userActivity')
            .where('userId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        if (activities.empty) {
            activityContainer.innerHTML = '<p class="text-secondary">No recent activity</p>';
            return;
        }

        const activitiesHTML = activities.docs.map(doc => {
            const activity = doc.data();
            return `
                <div class="activity-item">
                    <div class="activity-info">
                        <div>${activity.type}</div>
                        <div class="activity-time">
                            ${activity.deviceInfo?.browser || 'Unknown browser'} on 
                            ${activity.deviceInfo?.os || 'Unknown OS'}
                        </div>
                    </div>
                    <div class="text-secondary">
                        ${new Date(activity.timestamp.toDate()).toLocaleString()}
                    </div>
                </div>
            `;
        }).join('');

        activityContainer.innerHTML = activitiesHTML;
    } catch (error) {
        console.error('Error loading activity:', error);
        notifications.error('Failed to load recent activity');
    }
}

async function updateNotificationPreferences(type, enabled) {
    const user = auth.currentUser;
    
    try {
        await db.collection('userPreferences').doc(user.uid).set({
            notifications: {
                [type]: enabled
            }
        }, { merge: true });
        
        notifications.success('Notification preferences updated');
        logActivity('notification_preferences_updated', { type, enabled });
    } catch (error) {
        console.error('Error updating preferences:', error);
        notifications.error('Failed to update notification preferences');
    }
}

// Add these to the existing auth state listener
auth.onAuthStateChanged((user) => {
    if (user) {
        // ...existing code...
        loadConnectedApps();
        loadRecentActivity();
        loadNotificationPreferences();
        const hash = window.location.hash.slice(1) || 'profileSection';
        switch(hash) {
            case 'profileSection':
                loadProfileData();
                break;
            case 'securitySection':
                loadSecurityData();
                break;
            case 'privacySection':
                loadPrivacyData();
                break;
            // Add cases for new sections
        }
    }
});

async function loadNotificationPreferences() {
    const user = auth.currentUser;
    
    try {
        const prefs = await db.collection('userPreferences').doc(user.uid).get();
        const data = prefs.data()?.notifications || {};
        
        const emailNotifs = document.getElementById('emailNotifications');
        const securityAlerts = document.getElementById('securityAlerts');
        
        if (emailNotifs) emailNotifs.checked = data.email !== false;
        if (securityAlerts) securityAlerts.checked = data.security !== false;
        
        // Add event listeners
        emailNotifs?.addEventListener('change', (e) => {
            updateNotificationPreferences('email', e.target.checked);
        });
        
        securityAlerts?.addEventListener('change', (e) => {
            updateNotificationPreferences('security', e.target.checked);
        });
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

async function requireReauth() {
    // Show re-authentication modal
    return new Promise((resolve, reject) => {
        const modal = document.createElement('div');
        modal.className = 'reauth-modal';
        modal.innerHTML = `
            <div class="reauth-content">
                <h2>Confirm your password</h2>
                <input type="password" id="reauthPassword" class="form-input" placeholder="Your password">
                <div class="button-group">
                    <button class="btn" onclick="confirmReauth()">Confirm</button>
                    <button class="btn-secondary" onclick="cancelReauth()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        window.confirmReauth = async () => {
            try {
                const password = document.getElementById('reauthPassword').value;
                const credential = firebase.auth.EmailAuthProvider.credential(
                    auth.currentUser.email,
                    password
                );
                await auth.currentUser.reauthenticateWithCredential(credential);
                modal.remove();
                resolve();
            } catch (error) {
                notifications.error('Invalid password');
                reject(error);
            }
        };

        window.cancelReauth = () => {
            modal.remove();
            reject(new Error('Authentication cancelled'));
        };
    });
}

setInterval(updateSessionActivity, 5 * 60 * 1000);

window.addEventListener('load', updateUI);
window.addEventListener('load', showLogoutButton);
window.addEventListener('hashchange', updateUI);
