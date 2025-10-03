import axios from 'axios';

const API_BASE_URL = 'https://api.hashpay.app';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Interceptors can be added here once auth flow is wired up
