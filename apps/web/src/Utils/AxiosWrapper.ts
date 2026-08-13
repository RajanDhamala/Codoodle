

import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import { apiBaseUrl } from "./env";

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown[];
}

const api: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
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
    const response = error.response;
    const responseData = response?.data;

    if (responseData && typeof responseData === "object") {
      return Promise.reject({
        ...responseData,
        status: response.status,
      });
    }

    if (response) {
      return Promise.reject({
        status: response.status,
        message:
          typeof responseData === "string" ? responseData : error.message,
      });
    }

    return Promise.reject(error);
  }
);

export default api;
