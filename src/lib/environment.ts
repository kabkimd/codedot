export function isLovableEnvironment(): boolean {
  // Check if we're in Lovable environment by looking for Supabase availability
  // and checking if we're not running on localhost with Express server
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // If we're on localhost, assume Express environment
  // If we're on any other domain (like Lovable preview), use Supabase
  return !isLocalhost;
}