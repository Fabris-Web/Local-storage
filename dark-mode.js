// Dark Mode Toggle System
class DarkModeManager {
    constructor() {
        this.storageKey = 'darkModeEnabled';
        this.init();
    }

    init() {
        // Check for saved preference or system preference
        const savedMode = localStorage.getItem(this.storageKey);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDarkMode = savedMode !== null ? savedMode === 'true' : prefersDark;

        if (isDarkMode) {
            this.enableDarkMode();
        } else {
            this.disableDarkMode();
        }

        // Create toggle button
        this.createToggleButton();
    }

    createToggleButton() {
        // Find header or create a button container
        const header = document.querySelector('.header') || document.querySelector('header');
        if (!header) return;

        // Check if button already exists
        if (document.getElementById('darkModeToggle')) return;

        const toggleButton = document.createElement('button');
        toggleButton.id = 'darkModeToggle';
        toggleButton.className = 'dark-mode-toggle';
        toggleButton.innerHTML = '<span id="darkModeIcon">🌙</span>';
        toggleButton.title = 'Toggle Dark Mode';
        toggleButton.type = 'button';

        toggleButton.addEventListener('click', () => this.toggle());

        // Insert into header's button group if it exists
        const buttonGroup = header.querySelector('div:last-child');
        if (buttonGroup && buttonGroup.style.display !== 'block') {
            buttonGroup.insertBefore(toggleButton, buttonGroup.firstChild);
        } else {
            header.appendChild(toggleButton);
        }
    }

    toggle() {
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDarkMode) {
            this.disableDarkMode();
        } else {
            this.enableDarkMode();
        }
    }

    enableDarkMode() {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(this.storageKey, 'true');
        this.updateToggleButton();
    }

    disableDarkMode() {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem(this.storageKey, 'false');
        this.updateToggleButton();
    }

    updateToggleButton() {
        const icon = document.getElementById('darkModeIcon');
        if (icon) {
            const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
            icon.textContent = isDarkMode ? '☀️' : '🌙';
        }
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new DarkModeManager();
    });
} else {
    new DarkModeManager();
}
