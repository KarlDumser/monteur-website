// API Config - dynamisch je nach Environment

export const getApiUrl = () => {
  // Development: Verwende Umgebungsvariable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Production: Verwende gleichen Server (relative URL)
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  // Default (Development): localhost:3001
  return 'http://localhost:3001';
};

export const apiCall = async (endpoint, options = {}) => {
  const apiUrl = getApiUrl();
  const url = endpoint.startsWith('/api') 
    ? `${apiUrl}${endpoint}`
    : `${apiUrl}${endpoint}`;
    
  return fetch(url, options);
};
