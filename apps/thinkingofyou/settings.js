(function(back) {
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
  
  function save() {
    storage.writeJSON('thinkingofyou.json', settings);
  }
  
  // Main menu
  function showMainMenu() {
    const menu = {
      '': { 'title': 'Thinking of You' },
      '< Back': back,
      'My Name': {
        value: settings.myName || 'Not set',
        format: v => v || 'Not set',
        onchange: () => {
          E.showPrompt('Enter your name:').then(name => {
            if (name) {
              settings.myName = name;
              settings.isConfigured = true;
              save();
              showMainMenu();
            }
          });
        }
      },
      'Setup Type': {
        value: settings.setupType || 'create',
        format: v => v === 'create' ? 'Create New' : 'Join Existing',
        onchange: v => {
          settings.setupType = v;
          save();
          showMainMenu();
        }
      }
    };
    
    if (settings.setupType === 'create' || !settings.setupType) {
      // Show options for creating a new connection
      menu['My Link Code'] = {
        value: settings.linkCode,
        format: v => v || 'None'
      };
      menu['Webhook URL'] = {
        value: settings.webhookUrl ? 'Set' : 'Not set',
        format: v => v,
        onchange: () => {
          E.showPrompt('Webhook URL:').then(url => {
            if (url !== null) {
              settings.webhookUrl = url;
              save();
              showMainMenu();
            }
          });
        }
      };
    } else {
      // Show options for joining existing connection
      menu['Partner Code'] = {
        value: settings.partnerLinkCode || 'Not set',
        format: v => v || 'Not set',
        onchange: () => {
          E.showPrompt('Partner Link Code:').then(code => {
            if (code && code.length === 6) {
              settings.partnerLinkCode = code.toUpperCase();
              settings.linkCode = code.toUpperCase();
              save();
              E.showMessage('Code saved!', 'Thinking of You');
              setTimeout(() => showMainMenu(), 1500);
            } else if (code) {
              E.showMessage('Code must be\n6 characters', 'Error');
              setTimeout(() => showMainMenu(), 1500);
            }
          });
        }
      };
    }
    
    // Add regenerate code option
    menu['Regenerate Code'] = () => {
      E.showPrompt('Generate new\nlink code?', {buttons:{'Yes':true,'No':false}}).then(yes => {
        if (yes) {
          settings.linkCode = generateLinkCode();
          save();
          E.showMessage('New code:\n' + settings.linkCode, 'Code Generated');
          setTimeout(() => showMainMenu(), 2000);
        } else {
          showMainMenu();
        }
      });
    };
    
    E.showMenu(menu);
  }
  
  showMainMenu();
})
