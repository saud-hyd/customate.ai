import axios from 'axios';

// Enable mock data for development
const USE_MOCK_DATA = true;

// Create an Axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'
});

// Request interceptor to attach admin headers
api.interceptors.request.use(
  (config) => {
    // Handle mock data for development
    if (USE_MOCK_DATA && config.url.includes('/dashboard')) {
      console.log(`Using mock data for: ${config.url}`);
      return {
        ...config,
        adapter: () => {
          return Promise.resolve({
            data: getMockDashboardData(),
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
            request: {}
          });
        }
      };
    }

    const adminToken = localStorage.getItem('adminToken');
    const adminUsername = localStorage.getItem('adminUsername');
    
    if (adminToken) {
      config.headers['X-Admin-Key'] = adminToken;
    }
    
    if (adminUsername) {
      config.headers['X-Admin-User'] = adminUsername;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Mock data function
function getMockDashboardData() {
  return {
    clients: {
      total: 156,
      active: 142,
      new_last_30_days: 23,
      by_plan: {
        free: 75,
        basic: 42,
        professional: 25,
        enterprise: 14
      }
    },
    revenue: {
      total_arr: 124680,
      total_mrr: 10390,
      total_month: 10390,
      total_day: 346.33,
      time_series: Array.from({length: 30}, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        amount: 300 + Math.random() * 200
      }))
    },
    usage: {
      total_messages: 256789,
      today: {
        total_sessions: 342,
        total_messages: 4231,
        total_searches: 876,
        avg_response_time_ms: 245
      },
      yesterday: {
        total_sessions: 321,
        total_messages: 4024,
        total_searches: 784,
        avg_response_time_ms: 252
      },
      changes: {
        total_sessions: 6.54,
        total_messages: 5.14,
        total_searches: 11.73,
        avg_response_time: -2.78
      }
    },
    historical_data: Array.from({length: 30}, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      total_sessions: 250 + Math.floor(Math.random() * 150),
      total_messages: 3500 + Math.floor(Math.random() * 1500),
      total_searches: 700 + Math.floor(Math.random() * 300),
      avg_response_time_ms: 220 + Math.floor(Math.random() * 50)
    })),
    last_updated: new Date().toISOString()
  };
}

export default api;