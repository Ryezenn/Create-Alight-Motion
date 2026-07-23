// security.js - Strict front-end protection and developer tools blocking

(function() {
    // Show warning overlay and disable page
    function showSecurityAlert() {
        const overlay = document.getElementById('security-overlay');
        if (overlay) {
            overlay.className = 'overlay-visible animate-fade-in';
            // Hide main content
            const container = document.querySelector('.container');
            if (container) container.style.display = 'none';
        }
    }

    // 1. Disable Right Click (Context Menu)
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // 2. Disable Keyboard Shortcuts (F12, Inspect, View Source, Save)
    document.addEventListener('keydown', function(e) {
        // F12
        if (e.keyCode === 123 || e.key === 'F12') {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+I (Inspect Element), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspect Element selection tool), Ctrl+U (View Page Source), Ctrl+S (Save Page)
        if (e.ctrlKey) {
            if (e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
                e.preventDefault();
                return false;
            }
            if (e.key === 'u' || e.key === 'U' || e.keyCode === 85) {
                e.preventDefault();
                return false;
            }
            if (e.key === 's' || e.key === 'S' || e.keyCode === 83) {
                e.preventDefault();
                return false;
            }
        }
        
        // Command/Option/I for macOS Safari/Chrome
        if (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'I')) {
            e.preventDefault();
            return false;
        }
    });

    // 3. Disable Dragging and Selection
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
    });
})();
