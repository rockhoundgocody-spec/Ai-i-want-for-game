import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// --- SYSTEM BOOT SEQUENCE (Console FX) ---
console.log(
  "%c ROCKHOUND OS v4.5 \n%c ➤ KERNEL: ACTIVE \n%c ➤ UPLINK: SECURE \n%c ➤ NEURAL NET: ONLINE",
  "color: #22d3ee; font-weight: 900; font-size: 16px; background: #030508; padding: 10px 20px; border: 1px solid #22d3ee; border-radius: 4px;",
  "color: #a5f3fc; font-family: monospace; font-size: 10px; padding-left: 10px;",
  "color: #a5f3fc; font-family: monospace; font-size: 10px; padding-left: 10px;",
  "color: #4ade80; font-family: monospace; font-size: 10px; padding-left: 10px; font-weight: bold;"
);

// --- GLOBAL ERROR INTERCEPT ---
window.onerror = (message, source, lineno, colno, error) => {
  console.error(
    "%c [CRITICAL FAILURE] %c SYSTEM INSTABILITY DETECTED", 
    "color: #ef4444; font-weight: bold; background: #220505; padding: 2px 5px;", 
    "color: #ef4444; font-family: monospace;",
    "\nDetails:", error || message
  );
};

// --- SERVICE WORKER "UPLINK" ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log(
        "%c [SAT-LINK] %c CACHE PROTOCOL ESTABLISHED %c ID: " + registration.scope,
        "color: #facc15; font-weight: bold; background: #1a1305; padding: 2px 5px;",
        "color: #facc15; font-family: monospace;",
        "color: #713f12; font-family: monospace;"
      );
    }).catch(registrationError => {
      console.log(
        "%c [SAT-LINK] %c CONNECTION FAILED",
        "color: #ef4444; font-weight: bold; background: #220505; padding: 2px 5px;",
        "color: #ef4444; font-family: monospace;"
      );
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("FATAL: DOM ROOT NOT FOUND. ABORTING.");
}

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
