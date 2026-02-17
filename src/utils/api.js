// API Config - dynamisch je nach Environment

export const getApiUrl = () => {
  // Development: Verwende Umgebungsvariable falls gesetzt
  if (import.meta.env.VITE_API_URL) {
    console.log('📡 API URL from env:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  
  // Runtime check: Bin ich auf localhost? → local, sonst → production
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('🏠 Lokale Umgebung erkannt - nutze localhost:3001');
    return 'http://localhost:3001';
  }
  
  // Production: Nutze relative URL zur gleichen Domain
  console.log('🚀 Production Umgebung erkannt - nutze /api');
  return '/api';
};

export const apiCall = async (endpoint, options = {}) => {
  const apiUrl = getApiUrl();
  const url = endpoint.startsWith('/api') 
    ? `${apiUrl}${endpoint}`
    : `${apiUrl}${endpoint}`;
    
  return fetch(url, options);
};
