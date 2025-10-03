// Thinking of You - Bangle.js 2 App
// Main app file (app.js)

const API_ENDPOINT = 'https://mute-elsinore-pokyplays-01040d8f.koyeb.app/api';
const POLL_INTERVAL = 5000; // 5 seconds

let settings = {
  myName: '',
  partnerName: '',
  linkCode: '',
  webhookUrl: '',
  isConfigured: false
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
  settings.isConfigured = settings.myName !== '' && settings.partnerName !== '';
  
  // Save link code if it was just generated
  if (!stored.linkCode) {
    saveSettings();
  }
  
  console.log('Settings loaded:', settings.linkCode, settings.isConfigured);
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
  const statusText = statusOverride || (settings.isConfigured ? 'Connected!' : 'Connecting...');
  g.drawString(statusText, g.getWidth() / 2, 90);
  
  // Instruction text - smaller
  g.setFont('6x8', 1.5);
  if (settings.isConfigured) {
    g.drawString('Press SELECT', g.getWidth() / 2, 130);
    g.drawString('to send', g.getWidth() / 2, 148);
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
  
  g.drawString(settings.partnerName, g.getWidth() / 2, 70);
  
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
    });
  }).on('error', (e) => {
    console.log('Register error:', e);
  });
}

// Send ping to partner
function sendPing() {
  if (!settings.isConfigured) {
    Bangle.buzz(100);
    drawMainScreen('Not configured');
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
  if (!settings.isConfigured) return;
  
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
  if (settings.isConfigured) {
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

// Button handler
function onButton() {
  sendPing();
}

// Initialize app
function init() {
  loadSettings();
  drawMainScreen();
  
  if (settings.isConfigured) {
    registerWithBackend();
    startPolling();
  }
  
  // Set up button handler - BTN1 to send ping
  setWatch(onButton, BTN1, { repeat: true, edge: 'falling' });
}

// Clean up when app exits
E.on('kill', () => {
  stopPolling();
});

// Start the app
init();
