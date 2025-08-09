// src/components/common/Modal.jsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

/**
 * Modal component for displaying dialogs and popups
 * Creates a portal to render the modal at the root level of the DOM
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer = null,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = '',
}) => {
  const { t } = useTranslation('common');
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };
  
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  // Determine modal size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };
  
  const modalContent = (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="flex items-center justify-center min-h-screen p-4 text-center"
        onClick={handleOverlayClick}
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
        
        {/* Modal Content */}
        <div 
          className={`
            ${sizeClasses[size]}
            w-full bg-white rounded-lg shadow-xl transform transition-all
            relative p-0 ${className}
          `}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              {title && <h3 className="text-lg font-medium text-gray-900" id="modal-title">{title}</h3>}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  aria-label={t('modal.close')}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          
          {/* Body */}
          <div className="p-6">{children}</div>
          
          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end p-4 border-t border-gray-200">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  return createPortal(modalContent, document.body);
};

export default Modal;