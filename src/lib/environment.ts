export function isLovableEnvironment(): boolean {
  // Force to always use Express server instead of Supabase
  return false;
  
  // Original logic (commented out):
  // if (typeof window === 'undefined') return false;
  // const hostname = window.location.hostname;
  // const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  // return !isLocalhost;
}