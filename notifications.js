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
    }

    show(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getIcon(type);
        const content = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-message">${message}</div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        notification.innerHTML = content;
        this.container.appendChild(notification);

        // Auto-remove after 5 seconds
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
