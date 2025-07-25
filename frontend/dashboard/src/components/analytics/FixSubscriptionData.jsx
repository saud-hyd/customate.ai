// frontend/dashboard/src/components/analytics/FixSubscriptionData.jsx
import React, { useState } from 'react';
import api from '../../services/api';

const FixSubscriptionData = ({ onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const syncData = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/analytics/sync-subscription-usage');
      setMessage({
        type: 'success',
        text: `Successfully synced data: ${response.data.messages} messages, ${response.data.users} users`
      });
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to sync data:', error);
      setMessage({
        type: 'error',
        text: `Error syncing data: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Fix Subscription Data</h3>
      
      {message && (
        <div className={`p-3 mb-3 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}
      
      <button
        onClick={syncData}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        {loading ? 'Syncing...' : 'Sync Subscription Data'}
      </button>
      <p className="mt-2 text-sm text-gray-500">
        Use this button to fix the subscription data if it's showing 0 messages.
      </p>
    </div>
  );
};

export default FixSubscriptionData;