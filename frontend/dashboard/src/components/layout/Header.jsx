// Path: frontend/dashboard/src/components/layout/Header.jsx

import React, { useState, useRef, useEffect } from 'react';
import { BellIcon, UserCircleIcon, Cog6ToothIcon, CreditCardIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuth from '../../hooks/useAuth';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import clientService from '../../services/clientService';

const Header = () => {
  const { t } = useTranslation(['common', 'dashboard']);
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
    
    // Fetch client data when opening dropdown if not already loaded
    if (!dropdownOpen && !clientInfo && !loading) {
      fetchClientData();
    }
  };

  // Close dropdown when clicking outside
  useOnClickOutside(dropdownRef, () => setDropdownOpen(false));

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const data = await clientService.getClientInfo();
      setClientInfo(data);
    } catch (error) {
      console.error('Error fetching client info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 z-10">
      <div className="px-4 sm:px-6 lg:px-8 flex justify-end h-16">
        {/* Header right side */}
        <div className="flex items-center">
          {/* Notification bell */}
          <button
            type="button"
            className="ml-auto flex-shrink-0 bg-white p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <span className="sr-only">{t('common:header.viewNotifications')}</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          
          {/* User dropdown */}
          <div className="ml-3 relative" ref={dropdownRef}>
            <div>
              <button
                onClick={toggleDropdown}
                className="flex rounded-full bg-orange-600 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                id="user-menu-button"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <span className="sr-only">{t('common:header.openUserMenu')}</span>
                <div className="h-8 w-8 rounded-full bg-orange-600 flex items-center justify-center text-white uppercase font-medium text-sm">
                  {user?.name?.charAt(0) || clientInfo?.name?.charAt(0) || 'U'}
                </div>
              </button>
            </div>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div 
                className="absolute right-0 z-50 mt-2 w-60 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                tabIndex="-1"
              >
                {/* User info section */}
                <div className="px-4 py-3 border-b border-gray-100">
                  {loading ? (
                    <div className="text-center py-2">
                      <div className="spinner mx-auto"></div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900">
                        {clientInfo?.name || user?.name || t('common:header.defaultUser')}
                      </p>
                      <p className="text-sm font-light text-gray-500 truncate">
                        {clientInfo?.email || user?.email || t('common:header.defaultEmail')}
                      </p>
                      <p className="text-xs font-light text-orange-600 mt-1">
                        {clientInfo?.plan_type || t('common:header.freePlan')}
                      </p>
                    </>
                  )}
                </div>
                
                {/* Menu items */}
                
                <a
                  href="/settings/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  role="menuitem"
                >
                  <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                  {t('common:header.accountSettings')}
                </a>
                
                <a
                  href="/subscription"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  role="menuitem"
                >
                  <CreditCardIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                  {t('common:header.manageSubscription')}
                </a>
                
                <a
                  href="/settings/support"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  role="menuitem"
                >
                  <QuestionMarkCircleIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                  {t('common:header.helpSupport')}
                </a>
                
                <div className="border-t border-gray-100 mt-1"></div>
                
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  role="menuitem"
                >
                  {t('common:header.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;