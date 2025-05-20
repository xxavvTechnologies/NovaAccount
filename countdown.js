// Countdown timer for system decommissioning
document.addEventListener('DOMContentLoaded', function() {
    // Target date: June 20, 2025
    const targetDate = new Date('2025-06-20T00:00:00');
    
    // Create countdown element
    const countdownEl = document.createElement('div');
    countdownEl.classList.add('countdown-timer');
    
    // Insert countdown after the migration banner message
    const messageBanners = document.querySelectorAll('.migration-banner-content');
    if (messageBanners.length > 0) {
        messageBanners.forEach(banner => {
            const countdownDisplay = countdownEl.cloneNode(true);
            banner.appendChild(countdownDisplay);
            
            // Update countdown every second
            updateCountdown(countdownDisplay, targetDate);
            setInterval(() => updateCountdown(countdownDisplay, targetDate), 1000);
        });
    }
});

function updateCountdown(element, targetDate) {
    // Get current time
    const currentDate = new Date();
    
    // Calculate time difference
    const timeDiff = targetDate - currentDate;
    
    // Calculate days, hours, minutes, seconds
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    // Update countdown display
    element.innerHTML = `
        <div class="countdown-label">SYSTEM SHUTDOWN IN:</div>
        <div class="countdown-units">
            <div class="countdown-unit">
                <span class="countdown-value">${days}</span>
                <span class="countdown-label">days</span>
            </div>
            <div class="countdown-unit">
                <span class="countdown-value">${String(hours).padStart(2, '0')}</span>
                <span class="countdown-label">hrs</span>
            </div>
            <div class="countdown-unit">
                <span class="countdown-value">${String(minutes).padStart(2, '0')}</span>
                <span class="countdown-label">min</span>
            </div>
            <div class="countdown-unit">
                <span class="countdown-value">${String(seconds).padStart(2, '0')}</span>
                <span class="countdown-label">sec</span>
            </div>
        </div>
    `;
}
