import { createAuth0Client } from '@auth0/auth0-spa-js';

const NovaAccount = {
    config: {
        domain: 'auth.novawerks.xxavvgroup.com',
        client_id: 'nOTN4BAME0YkdMMCP5M2hYvjGz2Ar7WL',
        authorizationParams: {
            redirect_uri: window.location.origin,
            scope: 'openid profile email',
            audience: 'https://dev-oex5fnsu3gh2tvi2.us.auth0.com/api/v2/'
        }
    },

    routes: {
        '/': 'overview',
        '/personal-info': 'personalInfo',
        '/security': 'security',
        '/privacy': 'privacy'
    },

    views: {
        overview: {
            render: () => `
                <div class="welcome-section animate-in">
                    <h1>Welcome to your Nova Account</h1>
                    <p>Manage your info, privacy, and security to make Nova work better for you.</p>
                    <div class="profile-section"></div>
                    <div class="card-grid">
                        <!-- Cards rendered dynamically -->
                    </div>
                </div>
            `
        },
        personalInfo: {
            render: () => `
                <div class="personal-info animate-in">
                    <h1>Personal Info</h1>
                    <form id="profile-form" class="profile-form">
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" name="name" value="${NovaAccount.state.user?.name || ''}">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value="${NovaAccount.state.user?.email || ''}" readonly>
                        </div>
                        <button type="submit" class="btn-primary">Save Changes</button>
                    </form>
                </div>
            `
        },
        security: {
            render: () => `
                <div class="security-section animate-in">
                    <h1>Security Settings</h1>
                    <!-- Security content -->
                </div>
            `
        },
        privacy: {
            render: () => `
                <div class="privacy-section animate-in">
                    <h1>Privacy Settings</h1>
                    <!-- Privacy content -->
                </div>
            `
        }
    },

    state: {
        user: null,
        isLoading: false,
        error: null
    },

    async init() {
        try {
            this.auth0Client = await createAuth0Client({
                domain: this.config.domain,
                clientId: this.config.client_id,
                authorizationParams: this.config.authorizationParams,
                cacheLocation: 'localstorage',
                useRefreshTokens: true
            });

            // Handle hash-based navigation after Auth0 redirect
            if (window.location.hash) {
                const { appState } = await this.auth0Client.handleRedirectCallback();
                // Recover the intended URL
                window.history.replaceState({}, document.title, appState?.returnTo || window.location.pathname);
            }

            // Check authentication state and update UI
            const isAuthenticated = await this.auth0Client.isAuthenticated();
            if (isAuthenticated) {
                this.state.user = await this.auth0Client.getUser();
                const token = await this.auth0Client.getTokenSilently();
                this.state.accessToken = token;
            }

            this.updateUI();
            this.setupEventListeners();
            
            // Add router initialization
            window.addEventListener('popstate', () => this.handleRoute());
            this.handleRoute();
        } catch (error) {
            this.handleError(error);
        }
    },

    async handleRedirectCallback() {
        try {
            await this.auth0Client.handleRedirectCallback();
            const user = await this.auth0Client.getUser();
            this.state.user = user;
        } catch (error) {
            this.state.error = error;
        }
    },

    async login() {
        try {
            this.state.isLoading = true;
            await this.auth0Client.loginWithRedirect({
                appState: { returnTo: window.location.pathname }
            });
        } catch (error) {
            this.handleError(error);
        } finally {
            this.state.isLoading = false;
        }
    },

    async logout() {
        try {
            await this.auth0Client.logout({
                logoutParams: {
                    returnTo: window.location.origin
                }
            });
            this.state.user = null;
            this.state.accessToken = null;
            this.updateUI();
        } catch (error) {
            this.handleError(error);
        }
    },

    renderUserProfile() {
        const profileSection = document.querySelector('.profile-section');
        if (!profileSection || !this.state.user) return;

        profileSection.innerHTML = `
            <div class="profile-header">
                <img src="${this.state.user.picture}" alt="Profile" class="profile-picture">
                <h2>${this.state.user.name}</h2>
                <p>${this.state.user.email}</p>
            </div>
        `;
    },

    async updateUI() {
        const isAuthenticated = await this.auth0Client.isAuthenticated();
        const loadingElement = document.getElementById('loading');
        const mainContent = document.querySelector('.main-content');
        
        loadingElement.style.display = this.state.isLoading ? 'block' : 'none';
        mainContent.style.display = this.state.isLoading ? 'none' : 'block';

        if (isAuthenticated) {
            document.body.classList.add('authenticated');
            this.renderUserProfile();
            this.renderAccountCards();
        } else {
            document.body.classList.remove('authenticated');
        }
    },

    renderAccountCards() {
        const cardGrid = document.querySelector('.card-grid');
        if (!cardGrid) return;

        cardGrid.innerHTML = `
            <div class="card">
                <h3>Personal Info</h3>
                <p>Manage your basic info</p>
                <a href="#personal-info" class="card-link">Update</a>
            </div>
            <div class="card">
                <h3>Security</h3>
                <p>Manage your password and 2-step verification</p>
                <a href="#security" class="card-link">Manage</a>
            </div>
            <div class="card">
                <h3>Privacy</h3>
                <p>Control your visible information</p>
                <a href="#privacy" class="card-link">Review</a>
            </div>
        `;
    },

    async handleRoute() {
        const path = window.location.pathname || '/';
        const viewName = this.routes[path] || 'overview';
        const mainContent = document.querySelector('.content');
        
        if (this.views[viewName]) {
            mainContent.innerHTML = this.views[viewName].render();
            this.setupViewHandlers(viewName);
        }
    },

    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    },

    setupViewHandlers(viewName) {
        switch(viewName) {
            case 'personalInfo':
                const form = document.getElementById('profile-form');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        this.updateProfile({
                            name: form.name.value
                        });
                    });
                }
                break;
            // Add other view-specific handlers
        }
    },

    // Event listeners
    setupEventListeners() {
        document.querySelectorAll('[data-action]').forEach(element => {
            element.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (this[action]) {
                    this[action]();
                }
            });
        });

        // Add navigation listeners
        document.querySelectorAll('[data-nav]').forEach(element => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                const path = e.target.getAttribute('data-nav');
                this.navigate(path);
            });
        });
    },

    // Profile management
    async updateProfile(updates) {
        try {
            this.state.isLoading = true;
            const token = await this.auth0Client.getTokenSilently();
            
            const response = await fetch(`https://api.novawerks.xxavvgroup.com/api/v1/users/${this.state.user.sub}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Profile update failed');
            
            // Update local state and refresh user profile
            this.state.user = await this.auth0Client.getUser();
            this.updateUI();
        } catch (error) {
            this.handleError(error);
        } finally {
            this.state.isLoading = false;
        }
    },

    // Error handling
    handleError(error) {
        const errorBanner = document.createElement('div');
        errorBanner.className = 'error-banner';
        errorBanner.innerHTML = `
            <p>${error.message}</p>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        document.body.insertBefore(errorBanner, document.body.firstChild);
        console.error(error);
        this.state.error = error;
        setTimeout(() => errorBanner.remove(), 5000);
    }
};

// Banner handling
document.addEventListener('DOMContentLoaded', () => {
    const banner = document.querySelector('.announcement-banner');
    const closeButton = banner.querySelector('.close-button');

    // Check if banner was previously dismissed
    if (localStorage.getItem('bdmissed2.0')) {
        banner.classList.add('hidden');
    }

    closeButton.addEventListener('click', () => {
        banner.classList.add('hidden');
        localStorage.setItem('bdmissed2.0', 'true');
    });
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    NovaAccount.init();
});