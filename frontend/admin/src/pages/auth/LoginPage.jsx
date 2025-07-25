import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { useAdmin } from '../../hooks/useAdmin';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [apiKey, setApiKey] = useState(authService.getDefaultApiKey());
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdmin();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !apiKey) {
      toast.error('Please enter both username and API key');
      return;
    }
    
    try {
      setIsLoading(true);
      await login(username, apiKey);
      toast.success('Login successful');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed: ' + (error.message || 'Please check your credentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img
          className="mx-auto h-12 w-auto"
          src="/logo.svg"
          alt="Customate.ai"
        />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Admin Dashboard
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to manage clients and subscriptions
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <select
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="admin">Admin User</option>
                  <option value="support">Support User</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                Admin API Key
              </label>
              <div className="mt-1">
                <input
                  id="apiKey"
                  name="apiKey"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Default API key is loaded from environment variables.
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}