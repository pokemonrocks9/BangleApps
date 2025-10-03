(function(back) {
  const CONFIGURL = "https://pokemonrocks9.github.io/thinking-of-you-config/";
  
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
  
  if (!settings.linkCode) {
    settings.linkCode = generateLinkCode();
    storage.writeJSON('thinkingofyou.json', settings);
  }
  
  const url = CONFIGURL + '?' + 
              'linkCode=' + encodeURIComponent(settings.linkCode || '') +
              '&myName=' + encodeURIComponent(settings.myName || '') +
              '&partnerName=' + encodeURIComponent(settings.partnerName || '') +
              '&webhookUrl=' + encodeURIComponent(settings.webhookUrl || '');
  
  return {
    url: url,
    back: function(newSettings) {
      if (!newSettings) {
        back();
        return;
      }
      
      const currentSettings = storage.readJSON('thinkingofyou.json', true) || {};
      
      if (newSettings.myName) {
        currentSettings.myName = newSettings.myName;
      }
      
      if (newSettings.partnerName) {
        currentSettings.partnerName = newSettings.partnerName;
      }
      
      if (newSettings.webhookUrl !== undefined) {
        currentSettings.webhookUrl = newSettings.webhookUrl;
      }
      
      if (newSettings.partnerLinkCode) {
        currentSettings.linkCode = newSettings.partnerLinkCode;
      }
      
      currentSettings.isConfigured = (currentSettings.myName !== '' && currentSettings.myName !== undefined);
      
      storage.writeJSON('thinkingofyou.json', currentSettings);
      
      back();
    }
  };
});
