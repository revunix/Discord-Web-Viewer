// Theme Management
(function() {
  'use strict';
  
  const THEME_STORAGE_KEY = 'theme';
  
  // Theme texts for display
  const themeTexts = {
    auto: 'Auto',
    light: 'Hell', 
    dark: 'Dunkel'
  };
  
  // Apply theme to DOM
  function applyTheme(theme) {
    let effectiveTheme = theme;
    
    if (theme === 'auto') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Always set the data-bs-theme attribute with the effective theme
    document.documentElement.setAttribute('data-bs-theme', effectiveTheme);
    
    // Store in localStorage for client-side persistence
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    
    // Update current theme text in navbar
    const currentThemeText = document.getElementById('current-theme-text');
    if (currentThemeText) {
      currentThemeText.textContent = themeTexts[theme] || theme;
    }
    
    // Update active state in dropdown
    document.querySelectorAll('.theme-option').forEach(option => {
      option.classList.remove('active');
      if (option.dataset.theme === theme) {
        option.classList.add('active');
      }
    });
  }
  
  // Initialize theme system
  function initTheme() {
    // Get saved theme from localStorage or use auto as default
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'auto';
    
    // Apply initial theme
    applyTheme(savedTheme);
    
    // Listen for system theme changes when in auto mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'auto';
      if (currentTheme === 'auto') {
        applyTheme('auto'); // Re-apply auto theme to reflect system change
      }
    });
    
    // Handle theme selection clicks
    document.addEventListener('click', (e) => {
      const themeOption = e.target.closest('.theme-option');
      if (themeOption) {
        e.preventDefault();
        const selectedTheme = themeOption.dataset.theme;
        
        if (selectedTheme && ['auto', 'light', 'dark'].includes(selectedTheme)) {
          // Apply theme immediately
          applyTheme(selectedTheme);
        }
      }
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
