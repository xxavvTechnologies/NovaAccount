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

async function updatePassword() {
    try {
        await auth.sendPasswordResetEmail(auth.currentUser.email);
        alert('Password reset email sent!');
    } catch (err) {
        console.error('Error:', err);
    }
}

window.addEventListener('load', updateUI);
window.addEventListener('load', showLogoutButton);
window.addEventListener('hashchange', updateUI);
