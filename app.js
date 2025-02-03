let auth0Client;

async function updateUI() {
    const user = await auth0Client.getUser();
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="profile-section">
            <h1>Welcome, ${user.name}</h1>
            
            <div class="card">
                <h2>Profile</h2>
                <p>Email: ${user.email}</p>
                <p>Last login: ${new Date(user.updated_at).toLocaleDateString()}</p>
            </div>

            <div class="card">
                <h2>Security Settings</h2>
                <p>Email verification: ${user.email_verified ? 'Verified' : 'Not verified'}</p>
                <button class="btn" onclick="updatePassword()">Change Password</button>
            </div>

            <div class="card">
                <h2>Connected Apps</h2>
                <p>Manage applications connected to your Nova ID</p>
                <div id="connectedApps">Loading...</div>
            </div>
        </div>
    `;
}

function showLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.style.display = 'block';
    logoutBtn.addEventListener('click', () => {
        auth0Client.logout({
            returnTo: window.location.origin + '/signup.html'
        });
    });
}

async function updatePassword() {
    try {
        await auth0Client.changePassword({
            connection: 'Username-Password-Authentication'
        });
        alert('Password reset email sent!');
    } catch (err) {
        console.error('Error:', err);
    }
}

window.addEventListener('load', updateUI);
window.addEventListener('load', showLogoutButton);
window.addEventListener('hashchange', updateUI);
