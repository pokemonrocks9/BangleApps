(function(back) {
  const CONFIGURL = "https://pokemonrocks9.github.io/thinking-of-you-config/";
  
  // Load current settings
  const storage = require('Storage');
  const settings = storage.readJSON('thinkingofyou.json', true) || {};
  
  function generateLinkCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
  
  // Generate link code if needed
  if (!settings.linkCode) {
    settings.linkCode = generateLinkCode();
    storage.writeJSON('thinkingofyou.json', settings);
  }
  
  // Build URL with current settings
  const url = CONFIGURL + '?' + 
              'linkCode=' + encodeURIComponent(settings.linkCode || '') +
              '&myName=' + encodeURIComponent(settings.myName || '') +
              '&partnerName=' + encodeURIComponent(settings.partnerName || '') +
              '&webhookUrl=' + encodeURIComponent(settings.webhookUrl || '');
  
  // For Bangle.js, we need to handle the settings return via the App Loader
  // The settings page should be opened in the App Loader web interface
  // When settings are saved, they'll be returned as a JavaScript object
  
  // This function will be called by the App Loader with the returned settings
  if (typeof exports !== 'undefined') {
    exports.url = url;
    exports.onReturn = function(newSettings) {
      if (!newSettings) {
        back();
        return;
      }
      
      // Load existing settings
      const currentSettings = storage.readJSON('thinkingofyou.json', true) || {};
      
      // Update with new values
      if (newSettings.myName) {
        currentSettings.myName = newSettings.myName;
      }
      
      if (newSettings.partnerName) {
        currentSettings.partnerName = newSettings.partnerName;
      }
      
      if (newSettings.webhookUrl !== undefined) {
        currentSettings.webhookUrl = newSettings.webhookUrl;
      }
      
      // Handle joining with partner's link code
      if (newSettings.partnerLinkCode) {
        currentSettings.linkCode = newSettings.partnerLinkCode;
      }
      
      // Update configured status
      currentSettings.isConfigured = (currentSettings.myName !== '' && currentSettings.myName !== undefined);
      
      // Save updated settings
      storage.writeJSON('thinkingofyou.json', currentSettings);
      
      // Return to app
      back();
    };
  }
});