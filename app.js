let auth0Client;

const config = {
  domain: "auth.novawerks.xxavvgroup.com",
  clientId: "nOTN4BAME0YkdMMCP5M2hYvjGz2Ar7WL",
  redirectUri: window.location.href,
};

// Initialize Auth0
async function createAuth0ClientInstance() {
  try {
    auth0Client = await createAuth0(config);
  } catch (error) {
    console.error("Error initializing Auth0:", error);
  }
}

// Login handler
async function login() {
  try {
    await auth0Client.loginWithPopup();
    const user = await auth0Client.getUser();
    if (user) showProfile(user);
  } catch (error) {
    showError("Login failed. Please try again.");
    console.error("Login error:", error);
  }
}

// Show Profile
function showProfile(user) {
  document.getElementById("login-section").hidden = true;
  document.getElementById("profile-section").hidden = false;
  document.getElementById("user-name").textContent = user.name || "User";
  document.getElementById("user-email").textContent = user.email || "Email not available";
  document.getElementById("profile-picture").src = user.picture || "https://i.ibb.co/ckr2fSV/nova-5.png";
}

// Logout handler
async function logout() {
  try {
    await auth0Client.logout({ returnTo: config.redirectUri });
    document.getElementById("profile-section").hidden = true;
    document.getElementById("login-section").hidden = false;
  } catch (error) {
    showError("Logout failed. Please try again.");
    console.error("Logout error:", error);
  }
}

// Error modal
function showError(message) {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `<div class="modal-content"><h3>Error</h3><p>${message}</p><button onclick="this.parentElement.parentElement.remove()">Close</button></div>`;
  document.body.appendChild(modal);
}

// Initialize App
async function init() {
  document.getElementById("loading-section").hidden = false;
  await createAuth0ClientInstance();
  const user = await auth0Client.getUser();
  if (user) {
    showProfile(user);
  } else {
    document.getElementById("login-section").hidden = false;
  }
  document.getElementById("loading-section").hidden = true;
}

document.getElementById("login-btn").addEventListener("click", login);
document.getElementById("logout").addEventListener("click", logout);

init();
