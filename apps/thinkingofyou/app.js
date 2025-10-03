// Thinking of You - Bangle.js 2 App
// Main app file (app.js)

const API_ENDPOINT = 'https://mute-elsinore-pokyplays-01040d8f.koyeb.app/api';
const POLL_INTERVAL = 5000; // 5 seconds

let settings = {
  myName: '',
  partnerName: '',
  linkCode: '',
  webhookUrl: '',
  isConfigured: false,
  isRegistered: false
};

let pollTimer = null;
let statusResetTimer = null;

// Load settings from storage
function loadSettings() {
  const stored = require('Storage').readJSON('thinkingofyou.json', true) || {};
  settings.myName = stored.myName || '';
  settings.partnerName = stored.partnerName || '';
  settings.linkCode = stored.linkCode || generateLinkCode();
  settings.webhookUrl = stored.webhookUrl || '';
  settings.isConfigured = settings.myName !== '' && settings.linkCode !== '';
  settings.isRegistered = stored.isRegistered || false;
  
  // Save link code if it was just generated
  if (!stored.linkCode) {
    saveSettings();
  }
  
  console.log('Settings loaded:', settings.linkCode, settings.isConfigured, settings.isRegistered);
}

// Save settings to storage
function saveSettings() {
  require('Storage').writeJSON('thinkingofyou.json', settings);
}

// Generate a random 6-character link code
function generateLinkCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Draw the main screen
function drawMainScreen(statusOverride) {
  g.clear();
  g.setColor(0, 0, 0); // Black background
  g.fillRect(0, 0, g.getWidth(), g.getHeight());
  
  // Draw heart icon
  const heartX = g.getWidth() / 2;
  const heartY = 40;
  g.setColor(1, 0, 0); // Red heart
  g.fillCircle(heartX - 10, heartY, 10);
  g.fillCircle(heartX + 10, heartY, 10);
  g.fillPoly([
    heartX - 20, heartY + 5,
    heartX, heartY + 25,
    heartX + 20, heartY + 5
  ]);
  
  g.setColor(1, 1, 1); // White text
  
  // Status text - larger, centered
  g.setFont('6x8', 2);
  g.setFontAlign(0, 0);
  const statusText = statusOverride || (settings.isRegistered ? 'Connected!' : 'Connecting...');
  g.drawString(statusText, g.getWidth() / 2, 90);
  
  // Instruction text - smaller
  g.setFont('6x8', 1.5);
  if (settings.isRegistered) {
    g.drawString('Press button', g.getWidth() / 2, 130);
    g.drawString('to send', g.getWidth() / 2, 148);
  } else if (settings.isConfigured) {
    g.drawString('Registering...', g.getWidth() / 2, 130);
  } else {
    g.drawString('Open settings', g.getWidth() / 2, 130);
    g.drawString('on phone', g.getWidth() / 2, 148);
  }
  
  g.flip();
}

// Show notification when receiving a ping
function showNotification() {
  g.clear();
  g.setColor(0.8, 0.2, 0.4); // Pink/Red background
  g.fillRect(0, 0, g.getWidth(), g.getHeight());
  
  g.setColor(1, 1, 1); // White text
  g.setFont('6x8', 2);
  g.setFontAlign(0, 0);
  
  g.drawString(settings.partnerName || 'Partner', g.getWidth() / 2, 70);
  
  g.setFont('6x8', 1.5);
  g.drawString('is thinking', g.getWidth() / 2, 100);
  g.drawString('about you!', g.getWidth() / 2, 120);
  
  g.flip();
  
  // Vibrate
  Bangle.buzz(200).then(() => {
    return new Promise(resolve => setTimeout(resolve, 200));
  }).then(() => {
    return Bangle.buzz(200);
  });
  
  // Return to main screen after 4 seconds
  setTimeout(() => {
    drawMainScreen();
  }, 4000);
}

// Register with backend
function registerWithBackend() {
  if (!settings.linkCode || !settings.myName) {
    console.log('Cannot register - missing data');
    return;
  }
  
  console.log('Registering:', settings.linkCode, settings.myName);
  drawMainScreen('Registering...');
  
  const payload = {
    linkCode: settings.linkCode,
    name: settings.myName,
    webhookUrl: settings.webhookUrl
  };
  
  require('http').request({
    url: API_ENDPOINT + '/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, (res) => {
    let data = '';
    res.on('data', (d) => data += d);
    res.on('end', () => {
      console.log('Register response:', res.statusCode, data);
      if (res.statusCode === 200 || res.statusCode === 201) {
        settings.isRegistered = true;
        saveSettings();
        drawMainScreen('Connected!');
        setTimeout(() => {
          drawMainScreen();
        }, 2000);
        startPolling();
      } else {
        drawMainScreen('Reg failed');
        setTimeout(() => {
          drawMainScreen();
        }, 2000);
      }
    });
  }).on('error', (e) => {
    console.log('Register error:', e);
    drawMainScreen('Reg error');
    setTimeout(() => {
      drawMainScreen();
    }, 2000);
  });
}

// Send ping to partner
function sendPing() {
  if (!settings.isRegistered) {
    Bangle.buzz(100);
    drawMainScreen('Not ready');
    setTimeout(() => {
      drawMainScreen();
    }, 2000);
    return;
  }
  
  console.log('Sending ping');
  
  const payload = {
    linkCode: settings.linkCode,
    senderName: settings.myName
  };
  
  require('http').request({
    url: API_ENDPOINT + '/ping',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, (res) => {
    let data = '';
    res.on('data', (d) => data += d);
    res.on('end', () => {
      console.log('Ping response:', res.statusCode, data);
    });
  }).on('error', (e) => {
    console.log('Ping error:', e);
  });
  
  // Show feedback
  Bangle.buzz(100);
  drawMainScreen('Sent!');
  
  // Reset status after 2 seconds
  if (statusResetTimer) clearTimeout(statusResetTimer);
  statusResetTimer = setTimeout(() => {
    drawMainScreen();
  }, 2000);
}

// Check for incoming pings
function checkForPings() {
  if (!settings.isRegistered) return;
  
  const url = API_ENDPOINT + '/check?linkCode=' + 
              encodeURIComponent(settings.linkCode) + 
              '&recipientName=' + encodeURIComponent(settings.myName);
  
  require('http').request({
    url: url,
    method: 'GET'
  }, (res) => {
    let data = '';
    res.on('data', (d) => data += d);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.hasPing) {
          console.log('Received ping!');
          showNotification();
        }
      } catch (e) {
        console.log('Parse error:', e);
      }
    });
  }).on('error', (e) => {
    console.log('Check error:', e);
  });
}

// Start polling for pings
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  if (settings.isRegistered) {
    pollTimer = setInterval(checkForPings, POLL_INTERVAL);
    console.log('Polling started');
  }
}

// Stop polling
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log('Polling stopped');
  }
}

// Initialize app
function init() {
  // Load widgets first
  Bangle.loadWidgets();
  Bangle.drawWidgets();
  
  loadSettings();
  
  // Set up UI with button handler
  Bangle.setUI({
    mode: "custom",
    btn: function(n) {
      sendPing();
    }
  });
  
  drawMainScreen();
  
  if (settings.isConfigured && !settings.isRegistered) {
    registerWithBackend();
  } else if (settings.isRegistered) {
    startPolling();
  }
}

// Clean up when app exits
E.on('kill', () => {
  stopPolling();
});

// Start the app
init();
