// Keep-alive utility — pings the backend every 10 minutes
// so Railway free tier never spins down during active use

const BACKEND_URL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : '';

const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes
const PING_URL      = `${BACKEND_URL}/api/health`;

let intervalId = null;

async function ping() {
  try {
    const res = await fetch(PING_URL, { method: 'GET' });
    if (res.ok) {
      console.debug('[Rindex] Keep-alive ping ✅', new Date().toLocaleTimeString());
    }
  } catch {
    // Silently ignore — server may be waking up
    console.debug('[Rindex] Keep-alive ping failed — server may be starting up');
  }
}

export function startKeepAlive() {
  if (intervalId) return; // Already running
  ping(); // Immediate first ping on login
  intervalId = setInterval(ping, PING_INTERVAL);
  console.debug('[Rindex] Keep-alive started — pinging every 10 minutes');
}

export function stopKeepAlive() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.debug('[Rindex] Keep-alive stopped');
  }
}
