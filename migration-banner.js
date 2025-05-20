// Migration Banner functionality
document.addEventListener('DOMContentLoaded', function() {
    const migrationBanner = document.querySelector('.migration-banner');
    
    // Always ensure the banner is displayed
    migrationBanner.style.display = 'block';
    
    // Remove any previously stored dismissal preferences
    localStorage.removeItem('migrationBannerDismissed');
    localStorage.removeItem('migrationBannerExpires');
    
    // Add pulse animation to the banner after a delay
    setTimeout(() => {
        const createAccountLink = document.querySelector('.pulse-animation');
        if (createAccountLink) {
            createAccountLink.classList.add('pulse-animation');
        }
    }, 2000);
});
