

import axios, { type AxiosInstance, type AxiosResponse } from "axios";

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown[];
}

const api: AxiosInstance = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:3000`,
  timeout: 10000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiResponse | unknown;

    if (
      payload &&
      typeof payload === "object" &&
      "success" in payload
    ) {
      const apiResponse = payload as ApiResponse;
      if (!apiResponse.success) {
        return Promise.reject(apiResponse);
      }

      return apiResponse.data as unknown as AxiosResponse;
    }

    return payload as AxiosResponse;
  },
  (error) => {
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
