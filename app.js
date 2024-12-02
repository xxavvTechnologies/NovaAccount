let auth0Client;

const config = {
  domain: "auth.novawerks.xxavvgroup.com",
  clientId: "nOTN4BAME0YkdMMCP5M2hYvjGz2Ar7WL",
  redirectUri: window.location.href
};

async function createAuth0Client() {
  auth0Client = await auth0.createAuth0Client({
    domain: config.domain,
    client_id: config.clientId,
    redirect_uri: config.redirectUri
  });      
}

async function getManagementApiAccessToken() {
  const accessToken = await auth0Client.getTokenSilently({
    audience: `https://${config.domain}/api/v2/`,
    scope: 'read:users update:users'
  });
  return accessToken;
}

async function updateUserProfile(userId, updatedProfileData) {
  const token = await getManagementApiAccessToken();
  const response = await fetch(`https://${config.domain}/api/v2/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updatedProfileData)
  });
  return await response.json();
}

async function login() {
  try {
    await auth0Client.loginWithPopup();
    const user = await auth0Client.getUser();
    showProfile(user);
  } catch (error) {
    console.error("Login error", error);
  }
}

function showProfile(user) {
  document.getElementById("login").style.display = "none";
  document.getElementById("profile").style.display = "block";
  document.getElementById("user-name").textContent = user.name;
  document.getElementById("user-email").textContent = user.email;
  document.getElementById("profile-picture").src = user.picture || "https://i.ibb.co/ckr2fSV/nova-5.png";
}

async function logout() {
  await auth0Client.logout({ returnTo: window.location.href });
  document.getElementById("profile").style.display = "none";
  document.getElementById("login").style.display = "block";
}

async function editProfilePicture() {
  const newPictureUrl = prompt("Enter the URL of your new profile picture:");
  if (newPictureUrl) {
    const user = await auth0Client.getUser();
    await updateUserProfile(user.sub, { picture: newPictureUrl });
    document.getElementById("profile-picture").src = newPictureUrl;
  }
}

async function editName() {
  const newName = prompt("Enter your new name:");
  if (newName) {
    const user = await auth0Client.getUser();
    await updateUserProfile(user.sub, { name: newName });
    document.getElementById("user-name").textContent = newName;
  }
}

document.getElementById("login-btn").addEventListener("click", login);
document.getElementById("logout").addEventListener("click", logout);
document.getElementById("edit-profile-picture").addEventListener("click", editProfilePicture);
document.getElementById("edit-name").addEventListener("click", editName);

async function init() {
  document.getElementById("loading").style.display = "block";
  await createAuth0Client();
  const isAuthenticated = await auth0Client.isAuthenticated();
  if (isAuthenticated) {
    const user = await auth0Client.getUser();
    showProfile(user);
  } else {
    document.getElementById("login").style.display = "block";
  }
  document.getElementById("loading").style.display = "none";
}

init();