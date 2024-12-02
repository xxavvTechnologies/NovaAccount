let auth0Client;

const config = {
  domain: "auth.novawerks.xxavvgroup.com", // Replace with your Auth0 domain
  clientId: "nOTN4BAME0YkdMMCP5M2hYvjGz2Ar7WL", // Replace with your Auth0 client ID
  redirectUri: window.location.href
};

// Initialize the Auth0 client
async function createAuth0Client() {
  auth0Client = await createAuth0({
    domain: config.domain,
    client_id: config.clientId,
    redirect_uri: config.redirectUri
  });
}

// Get Management API Access Token
async function getManagementApiAccessToken() {
  const accessToken = await auth0Client.getTokenWithPopup({
    audience: `https://${config.domain}/api/v2/`,
    scope: 'read:users update:users'  // Scopes for updating the user profile
  });

  return accessToken;
}

// Update User Profile
async function updateUserProfile(userId, updatedProfileData) {
  const token = await getManagementApiAccessToken();
  
  const response = await fetch(`https://${config.domain}/api/v2/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`  // Use the token for Authorization
    },
    body: JSON.stringify(updatedProfileData)
  });

  const data = await response.json();
  return data;
}

// Handle login
async function login() {
  try {
    await auth0Client.loginWithPopup();
    const user = await auth0Client.getUser();
    showProfile(user);
  } catch (error) {
    console.error("Login error", error);
  }
}

// Show the profile page
function showProfile(user) {
  document.getElementById("login").style.display = "none";
  document.getElementById("profile").style.display = "block";

  document.getElementById("user-name").textContent = user.name;
  document.getElementById("user-email").textContent = user.email;
  document.getElementById("profile-picture").src = user.picture || "https://i.ibb.co/ckr2fSV/nova-5.png";  // Add default if no picture
}

// Handle logout
async function logout() {
  await auth0Client.logout({ returnTo: window.location.href });
  document.getElementById("profile").style.display = "none";
  document.getElementById("login").style.display = "block";
}

// Set up event listeners
document.getElementById("login-btn").addEventListener("click", login);
document.getElementById("logout").addEventListener("click", logout);

// Initialize the app
async function init() {
  document.getElementById("loading").style.display = "block";

  await createAuth0Client();
  
  const user = await auth0Client.getUser();
  if (user) {
    showProfile(user);
  } else {
    document.getElementById("login").style.display = "block";
  }

  document.getElementById("loading").style.display = "none";
}

init();
