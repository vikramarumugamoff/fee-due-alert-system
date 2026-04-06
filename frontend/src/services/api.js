import axios from "axios";

// Configure Axios base URL from Vite env; fallback to localhost for dev.
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
axios.defaults.withCredentials = true;

export default axios;
