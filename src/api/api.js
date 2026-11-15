import axios from "axios";

// ! 1 Configuration

const BASE_URL = "url";
let accessToken = null;
let isRefreshing = false;
let failedQueue = [];

// ! 1 Configuration

// ! 2 Instance

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
const refreshAPI = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ! 2 Instance

// ! 3 Set and Clear access token

export const setAccessToken = (token) => {
  accessToken = token;
};

export const clearToken = () => {
  accessToken = null;
};

// ! 3 Set and Clear access token

// ! 4 Process Queue

const processQueue = (error, token = null) => {
  failedQueue.forEach((request) => {
    if (error) {
      request.reject(error);
    } else {
      request.resolve(token);
    }
  });

  failedQueue = [];
};

// ! 4 Process Queue

// ! 5 Request Interceptors

api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ! 5 Request Interceptors

// ! 6 Response Interceptors

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = ` Bearer ${newToken}`;
        return api(originalRequest);
      });
    }

    isRefreshing = true;
    try {
      const response = await refreshAPI.post("auth/refresh");
      const newAccessToken = response.data.accessToken;
      processQueue(null, newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// ! 6 Response Interceptors

// ! Export Default Axios
export default api;
// ! Export Default Axios
