import React, { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import subscriptionService from '../../services/subscriptionService';

/**
 * Component to display usage limit alert notifications
 * Checks subscription limits and shows appropriate warnings
 */
const UsageAlertNotification = () => {
  const [alerts, setAlerts] = useState([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Check for limit alerts on component mount
    checkLimits();
    
    // Set up interval to periodically check limits (every hour)
    const interval = setInterval(checkLimits, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Hide notification and store in session storage
  const dismissAlert = (type) => {
    // Filter out the dismissed alert
    setAlerts(alerts.filter(alert => alert.type !== type));
    
    // Remember that this alert was dismissed in this session
    sessionStorage.setItem(`limit_alert_${type}`, new Date().toISOString());
  };
  
  // Check if we should show this alert (not dismissed in this session)
  const shouldShowAlert = (type) => {
    const lastDismissed = sessionStorage.getItem(`limit_alert_${type}`);
    if (!lastDismissed) return true;
    
    // Show again if it's been more than 12 hours
    const dismissedTime = new Date(lastDismissed).getTime();
    const currentTime = new Date().getTime();
    return (currentTime - dismissedTime) > 12 * 60 * 60 * 1000;
  };

  // Check subscription limits
  const checkLimits = async () => {
    try {
      const limitData = await subscriptionService.checkLimits();
      const newAlerts = [];
      
      // Process limit data and create alerts
      if (limitData && limitData.current) {
        // Check each limit type
        Object.entries(limitData.current).forEach(([limitType, limitInfo]) => {
          // Skip if limit is low
          if (limitInfo.percentage < 75) return;
          
          // If limit is very close or exceeded, create an alert
          if (limitInfo.percentage >= 95) {
            // Critical alert for over 95% usage
            if (shouldShowAlert(`${limitType}_critical`)) {
              newAlerts.push({
                type: `${limitType}_critical`,
                severity: 'critical',
                limitType,
                percentage: limitInfo.percentage,
                used: limitInfo.used,
                limit: limitInfo.limit
              });
            }
          } else if (limitInfo.percentage >= 85) {
            // Warning alert for over 85% usage
            if (shouldShowAlert(`${limitType}_warning`)) {
              newAlerts.push({
                type: `${limitType}_warning`,
                severity: 'warning',
                limitType,
                percentage: limitInfo.percentage,
                used: limitInfo.used,
                limit: limitInfo.limit
              });
            }
          } else if (limitInfo.percentage >= 75) {
            // Notice alert for over 75% usage
            if (shouldShowAlert(`${limitType}_notice`)) {
              newAlerts.push({
                type: `${limitType}_notice`,
                severity: 'notice',
                limitType,
                percentage: limitInfo.percentage,
                used: limitInfo.used,
                limit: limitInfo.limit
              });
            }
          }
        });
        
        // Update alerts state
        setAlerts(newAlerts);
      }
    } catch (error) {
      console.error('Error checking limits:', error);
    }
  };

  // Don't render anything if no alerts or not visible
  if (!visible || alerts.length === 0) {
    return null;
  }

  // Get the most critical alert to show
  const priorityOrder = ['critical', 'warning', 'notice'];
  const alertToShow = alerts.sort((a, b) => 
    priorityOrder.indexOf(a.severity) - priorityOrder.indexOf(b.severity)
  )[0];

  // Format limit type for display
  const limitTypeDisplay = {
    messages: 'message',
    users: 'active user',
    storage: 'storage',
    collections: 'knowledge collection'
  };

  // Format the display value based on limit type
  const formatValue = (value, limitType) => {
    if (limitType === 'storage') {
      // Convert bytes to MB or GB
      const mbValue = value / (1024 * 1024);
      return mbValue >= 1024 ? `${(mbValue / 1024).toFixed(2)} GB` : `${mbValue.toFixed(2)} MB`;
    }
    return value.toLocaleString();
  };

  // Get background color based on severity
  const getBgColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100';
      case 'warning':
        return 'bg-yellow-100';
      case 'notice':
        return 'bg-blue-100';
      default:
        return 'bg-gray-100';
    }
  };

  // Get text color based on severity
  const getTextColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'notice':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 max-w-md rounded-lg shadow-lg ${getBgColor(alertToShow.severity)} p-4 z-50`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className={`h-5 w-5 ${getTextColor(alertToShow.severity)}`} aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${getTextColor(alertToShow.severity)}`}>
            {alertToShow.severity === 'critical' ? 'Urgent: ' : ''}
            {limitTypeDisplay[alertToShow.limitType] || alertToShow.limitType} limit {alertToShow.percentage >= 100 ? 'exceeded' : 'approaching'}
          </h3>
          <div className={`mt-2 text-sm ${getTextColor(alertToShow.severity)}`}>
            <p>
              You've used {alertToShow.percentage.toFixed(1)}% of your {limitTypeDisplay[alertToShow.limitType] || alertToShow.limitType} limit 
              ({formatValue(alertToShow.used, alertToShow.limitType)} of {formatValue(alertToShow.limit, alertToShow.limitType)}).
            </p>
          </div>
          <div className="mt-2">
            <Link
              to="/subscription"
              className={`inline-flex items-center px-2 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white ${
                alertToShow.severity === 'critical' ? 'bg-red-600 hover:bg-red-700' : 
                alertToShow.severity === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
            >
              <ArrowUpIcon className="-ml-0.5 mr-1 h-3 w-3" aria-hidden="true" />
              Upgrade Plan
            </Link>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={() => dismissAlert(alertToShow.type)}
              className={`inline-flex rounded-md p-1.5 ${getTextColor(alertToShow.severity)} hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageAlertNotification;