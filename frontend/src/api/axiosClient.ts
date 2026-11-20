import axios from 'axios';

// Backend unique (monolithe) : une seule URL d'API. L'ancien découpage
// cadastre/promoteur (deux ports, deux baseURL) n'a plus lieu d'être.
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const axiosClient = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Export par défaut en plus de l'export nommé : les pages Promoteur
// (Mame Ndiaya) importent `import axiosClient from '...'`, les pages
// Cadastre/auth (Carla) importent `import { axiosClient } from '...'`.
export default axiosClient;
