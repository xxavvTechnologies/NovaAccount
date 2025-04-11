class NotificationSystem {
    constructor() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);

        // Add mobile-specific positioning
        if (window.innerWidth <= 768) {
            this.container.style.left = '16px';
            this.container.style.right = '16px';
            this.container.style.bottom = 'calc(80px + var(--safe-area-inset-bottom))';
        }
    }

    show(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Enhanced mobile-friendly notification
        const content = `
            <div class="notification-content">
                <div class="notification-icon">${this.getIcon(type)}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" aria-label="Close">×</button>
        `;
        
        notification.innerHTML = content;

        // Add touch event handling
        notification.querySelector('.notification-close').addEventListener('touchend', (e) => {
            e.preventDefault();
            notification.classList.add('notification-hide');
            setTimeout(() => notification.remove(), 300);
        });

        this.container.appendChild(notification);

        // Auto-remove with transition
        setTimeout(() => {
            notification.classList.add('notification-hide');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    getIcon(type) {
        switch(type) {
            case 'success':
                return '✓';
            case 'error':
                return '!';
            case 'warning':
                return '⚠';
            default:
                return 'i';
        }
    }

    error(message) {
        this.show(message, 'error');
    }

    success(message) {
        this.show(message, 'success');
    }

    warning(message) {
        this.show(message, 'warning');
    }

    info(message) {
        this.show(message, 'info');
    }
}

// Create instance after DOM is ready
let notifications;
document.addEventListener('DOMContentLoaded', () => {
    notifications = new NotificationSystem();
});

// Export a proxy to handle calls before initialization
window.notifications = new Proxy({}, {
    get: (target, prop) => {
        return (...args) => {
            if (notifications) {
                return notifications[prop](...args);
            } else {
                // Queue notification for when system is ready
                document.addEventListener('DOMContentLoaded', () => {
                    notifications[prop](...args);
                });
            }
        };
    }
});
