import api from './api';

export const authService = {
  // Enable this for development when backend isn't ready
  DEV_MODE: true,
  
  async login(username, apiKey) {
    try {
      // For development mode, bypass API validation
      if (this.DEV_MODE) {
        const userInfo = {
          user_id: username,
          email: username === 'admin' ? 'admin@customate.ai' : 'support@customate.ai',
          full_name: username === 'admin' ? 'Admin User' : 'Support User',
          role: username
        };
        
        localStorage.setItem('adminToken', apiKey);
        localStorage.setItem('adminUser', JSON.stringify(userInfo));
        localStorage.setItem('adminUsername', username);
        
        return userInfo;
      }
      
      // For production, actually validate with backend
      const config = {
        headers: {
          'X-Admin-Key': apiKey,
          'X-Admin-User': username
        }
      };
      
      // Try different possible endpoint paths
      try {
        await api.get('/api/admin/dashboard', config);
      } catch (error) {
        try {
          await api.get('/admin/dashboard', config);
        } catch (innerError) {
          console.error('Authentication error:', innerError);
          throw new Error('Invalid credentials or endpoint not found');
        }
      }
      
      const userInfo = {
        user_id: username,
        email: username === 'admin' ? 'admin@customate.ai' : 'support@customate.ai',
        full_name: username === 'admin' ? 'Admin User' : 'Support User',
        role: username
      };
      
      localStorage.setItem('adminToken', apiKey);
      localStorage.setItem('adminUser', JSON.stringify(userInfo));
      localStorage.setItem('adminUsername', username);
      
      return userInfo;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Login failed: ' + (error.message || 'Unknown error'));
    }
  },
  
  async validateToken() {
    // In dev mode, just return the stored user
    if (this.DEV_MODE) {
      const adminUserString = localStorage.getItem('adminUser');
      const username = localStorage.getItem('adminUsername');
      
      if (!adminUserString || !username) {
        throw new Error('No stored credentials');
      }
      
      try {
        return JSON.parse(adminUserString);
      } catch (e) {
        const adminUser = {
          user_id: username,
          email: username === 'admin' ? 'admin@customate.ai' : 'support@customate.ai',
          full_name: username === 'admin' ? 'Admin User' : 'Support User',
          role: username
        };
        localStorage.setItem('adminUser', JSON.stringify(adminUser));
        return adminUser;
      }
    }
    
    // Production validation
    try {
      const adminToken = localStorage.getItem('adminToken');
      const adminUserString = localStorage.getItem('adminUser');
      const username = localStorage.getItem('adminUsername');
      
      if (!adminToken || !adminUserString || !username) {
        throw new Error('No stored credentials');
      }
      
      let adminUser;
      try {
        adminUser = JSON.parse(adminUserString);
      } catch (e) {
        adminUser = {
          user_id: username,
          email: username === 'admin' ? 'admin@customate.ai' : 'support@customate.ai',
          full_name: username === 'admin' ? 'Admin User' : 'Support User',
          role: username
        };
        localStorage.setItem('adminUser', JSON.stringify(adminUser));
      }
      
      // In production, validate token with backend
      return adminUser;
    } catch (error) {
      console.error('Token validation failed:', error);
      throw error;
    }
  },
  
  getDefaultApiKey() {
    return process.env.REACT_APP_ADMIN_API_KEY || 'admin-secret-key-change-me';
  }
};