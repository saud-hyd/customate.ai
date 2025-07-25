import React from 'react';
import { getConfig } from '../config';

const ChatHeader = ({ title, onClose }) => {
  const config = getConfig();
  
  return (
    <div className="customate-widget-header">
      {/* Logo/Brand Section */}
      <div className="customate-widget-brand">
        {config.logoUrl ? (
          <img 
            src={config.logoUrl} 
            alt={`${title} logo`} 
            className="customate-widget-logo"
          />
        ) : (
          <div className="customate-widget-default-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/>
            </svg>
          </div>
        )}
        <h3 className="customate-widget-title">{title}</h3>
      </div>
      
      {/* Controls */}
      <div className="customate-widget-controls">
        {config.showMinimize && (
          <button 
            className="customate-widget-control-button customate-widget-minimize"
            aria-label="Minimize chat"
            onClick={() => onClose()} // Same as close for now
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 13H5V11H19V13Z" fill="currentColor"/>
            </svg>
          </button>
        )}
        
        <button 
          className="customate-widget-control-button customate-widget-close"
          aria-label="Close chat"
          onClick={() => onClose()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;