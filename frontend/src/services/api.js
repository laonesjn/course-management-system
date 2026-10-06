import axios from "axios";
import { clearAuth } from "./auth";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
});


// Add JWT token to requests
api.interceptors.request.use(
  (config) => {

    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

let isRedirecting = false;

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (!error.response) {
      return Promise.reject(error);
    }
    
    if (error.response.status === 401) {
      if (error.config && error.config.url && !error.config.url.includes("/auth/login") && !error.config.url.endsWith("/login")) {
        if (!isRedirecting) {
          isRedirecting = true;
          clearAuth();
          
          const currentPath = window.location.pathname;
          const search = window.location.search;
          const from = encodeURIComponent(currentPath + search);
          
          window.location.href = `/login?expired=true&from=${from}`;
        }
      }
    }
    
    return Promise.reject(error);
  }
);


export default api;
