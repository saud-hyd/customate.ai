import React, { useState, useEffect, useRef } from 'react';
import {
  BellIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import notificationService from '../../services/notificationService';
import { formatDistanceToNow } from 'date-fns';

/**
 * Notification Center Component
 * Displays a dropdown with system notifications and alerts
 */
const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useOnClickOutside(dropdownRef, () => setIsOpen(false));
  
  // Load notifications on component mount and periodically refresh
  useEffect(() => {
    fetchNotifications();
    
    // Set interval to check for new notifications every minute
    const interval = setInterval(fetchNotifications, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getUnreadNotifications();
      
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      ));
      
      // Update unread count
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(notifications.map(notification => ({ ...notification, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  // Toggle the dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'subscription_updated':
      case 'payment_success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'limit_warning':
      case 'payment_failed':
        return <ExclamationCircleIcon className="h-6 w-6 text-orange-500" />;
      case 'limit_exceeded':
      case 'subscription_cancelled':
      case 'subscription_expiring':
        return <ExclamationCircleIcon className="h-6 w-6 text-red-500" />;
      default:
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell icon with unread indicator */}
      <button 
        className="relative p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        onClick={toggleDropdown}
      >
        <span className="sr-only">View notifications</span>
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        
        {/* Unread indicator */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>
      
      {/* Dropdown panel */}
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="notifications-menu">
            {/* Header */}
            <div className="px-4 py-2 flex justify-between items-center border-b">
              <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  className="text-xs text-primary-600 hover:text-primary-800"
                  onClick={markAllAsRead}
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="px-4 py-2 text-center text-sm text-gray-500">
                  Loading notifications...
                </div>
              ) : notifications.length > 0 ? (
                notifications.map(notification => (
                  <div 
                    key={notification.id}
                    className={`px-4 py-3 flex items-start hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="ml-3 w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {notification.message}
                      </p>
                      <div className="mt-2 flex justify-between">
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        {!notification.read && (
                          <button
                            className="text-xs text-primary-600 hover:text-primary-800"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Dismiss button */}
                    <div className="ml-4 flex-shrink-0 flex">
                      <button
                        className="bg-white rounded-md text-gray-400 hover:text-gray-500"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No new notifications
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-4 py-2 border-t text-xs text-center">
              <a 
                href="/notifications" 
                className="text-primary-600 hover:text-primary-800"
              >
                View all notifications
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;