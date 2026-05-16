import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your machine's IP address if testing on a physical device
const BASE_URL = 'http://172.20.10.4:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handler for 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // If token is invalid or expired, clear it and force logout
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userRole');
      
      // Import the store dynamically to avoid circular dependency issues at boot
      const useStore = require('../store/useStore').default;
      useStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
