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

setInterval(updateSessionActivity, 5 * 60 * 1000);

window.addEventListener('load', updateUI);
window.addEventListener('load', showLogoutButton);
window.addEventListener('hashchange', updateUI);
