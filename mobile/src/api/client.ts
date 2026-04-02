import axios from 'axios';
import { apiUrl } from '../config/env';
import { getStoredAccessToken } from './secureStorage';

export const api = axios.create({
  baseURL: apiUrl || undefined,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);
