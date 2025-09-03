// frontend/widget-app/src/WidgetApp.jsx
import React, { useState, useEffect, useRef } from 'react';
import TabbedChatWidget from './components/TabbedChatWidget'; // NEW: Import the tabbed widget
import useSettings from './hooks/useSettings';
import useChat from './hooks/useChat';
import './styles/widget.css';
import ChatInterface from './components/ChatInterface'; // Import ChatInterface if needed

const WidgetApp = () => {
  // Widget state
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Refs
  const containerRef = useRef(null);
  
  // Get settings and chat functionality (delayed initialization)
  const { settings, error: settingsError, initialize: initializeSettings } = useSettings();
  const { messages, isTyping, sendMessage, resetChat, error: chatError } = useChat(settings);
  
  // Helper function to notify parent window
  const notifyParent = (type, data = {}) => {
    try {
      window.parent.postMessage({
        type,
        data: {
          ...data,
          timestamp: Date.now(),
          widgetId: config?.apiKey || 'unknown'
        }
      }, '*');
    } catch (error) {
      console.warn('Could not notify parent:', error);
    }
  };
  
  // Mobile detection utility - desktop-first with precise mobile detection
  const detectMobile = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const screenWidth = window.innerWidth || document.documentElement.clientWidth;
    const screenHeight = window.innerHeight || document.documentElement.clientHeight;
    
    // Check if this is definitely a desktop environment
    const isDesktopUserAgent = (
      /Windows NT|Macintosh|Linux x86_64|X11.*Linux|CrOS/i.test(userAgent) &&
      !/Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent)
    );
    
    // If definitely desktop UA with large screen, never treat as mobile
    if (isDesktopUserAgent && screenWidth > 1024) {
      console.log('📱 Mobile Detection: Desktop detected (large screen + desktop UA)', {
        screenWidth: screenWidth,
        isDesktopUserAgent: isDesktopUserAgent,
        finalResult: false
      });
      return false;
    }
    
    // Screen width threshold - but be more conservative
    const isSmallScreen = screenWidth <= 768;
    
    // Mobile user agent detection
    const isMobileUserAgent = (
      /android/i.test(userAgent) ||
      /iPad|iPhone|iPod/.test(userAgent) ||
      /Mobile|Opera Mini|Opera Mobi|BlackBerry|Windows Phone/i.test(userAgent)
    );
    
    // Touch support - but desktop can have touch too
    const hasTouchSupport = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    // More precise mobile detection:
    // 1. If mobile user agent - likely mobile regardless of screen size
    // 2. If small screen AND touch support - likely mobile (device toolbar testing)
    // 3. If small screen but no mobile UA and no touch - likely desktop browser resized
    let isMobileDevice = false;
    
    if (isMobileUserAgent) {
      isMobileDevice = true; // True mobile device
    } else if (isSmallScreen && hasTouchSupport) {
      isMobileDevice = true; // Desktop browser in mobile mode with touch
    } else if (isSmallScreen && !hasTouchSupport) {
      // Small screen but no mobile UA and no touch - could be desktop browser resized
      // Check if this looks like device toolbar testing (common mobile widths)
      const commonMobileWidths = [320, 375, 414, 405, 360, 390, 428, 768]; // Added 405 for Chrome dev tools
      const isCommonMobileWidth = commonMobileWidths.some(width => 
        Math.abs(screenWidth - width) <= 2
      );
      isMobileDevice = isCommonMobileWidth;
    }
    
    // Debug logging
    console.log('📱 Mobile Detection:', {
      screenWidth: screenWidth,
      screenHeight: screenHeight,
      isDesktopUserAgent: isDesktopUserAgent,
      isSmallScreen: isSmallScreen,
      isMobileUserAgent: isMobileUserAgent,
      hasTouchSupport: hasTouchSupport,
      finalResult: isMobileDevice,
      userAgent: userAgent.slice(0, 50) + '...'
    });
    
    return isMobileDevice;
  };
  
  // CRITICAL FIX: Set proper viewport height for mobile browsers
  const setViewportHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // Initialize widget configuration and mobile detection
  useEffect(() => {
    // CRITICAL FIX: Set initial viewport height for mobile browsers
    setViewportHeight();
    
    // Detect mobile device
    const mobileDetected = detectMobile();
    setIsMobile(mobileDetected);
    
    // Get config from URL params or window object
    const urlParams = new URLSearchParams(window.location.search);
    const floating = urlParams.get('floating') === 'true';
    
    const initialConfig = {
      floating: floating,
      apiKey: urlParams.get('api_key') || window.REACT_WIDGET_CONFIG?.apiKey,
      testMode: urlParams.get('test') === 'true' || window.REACT_WIDGET_CONFIG?.testMode
    };
    
    setConfig(initialConfig);
    
    // For floating widgets, start collapsed (except on mobile - auto-expand for better UX)
    if (floating) {
      setIsExpanded(mobileDetected); // Auto-expand on mobile, collapsed on desktop
      // PERFORMANCE: Initialize settings if mobile auto-expanded
      if (mobileDetected) {
        initializeSettings();
      }
    } else {
      setIsExpanded(true); // Inline widgets are always expanded
      // PERFORMANCE: Initialize settings for inline widgets since they're immediately visible  
      initializeSettings();
      
      // CRITICAL FIX: Apply mobile-fullscreen immediately for inline widgets on mobile
      if (mobileDetected && containerRef.current) {
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.classList.add('mobile-fullscreen');
            console.log('🔧 FIXED: Mobile fullscreen applied immediately for inline widget');
          }
        }, 0);
      }
    }
  }, []);
  
  // Handle window resize for responsive mobile detection and fullscreen updates
  useEffect(() => {
    let lastDetectionTime = 0;
    let stableDetectionCount = 0;
    let lastStableResult = isMobile;
    
    const handleResize = () => {
      // CRITICAL FIX: Update viewport height on every resize (important for mobile keyboard)
      setViewportHeight();
      
      const now = Date.now();
      const mobileDetected = detectMobile();
      
      // Prevent rapid oscillation by requiring stable detection
      if (mobileDetected === lastStableResult) {
        stableDetectionCount++;
      } else {
        stableDetectionCount = 0;
        lastStableResult = mobileDetected;
      }
      
      // Only change state if we have stable detection for at least 2 checks
      // or if enough time has passed (500ms) to prevent oscillation
      const timeSinceLastChange = now - lastDetectionTime;
      const shouldUpdate = (
        mobileDetected !== isMobile && 
        (stableDetectionCount >= 1 || timeSinceLastChange > 500)
      );
      
      if (shouldUpdate) {
        console.log('Mobile detection changed:', { 
          from: isMobile, 
          to: mobileDetected,
          stableCount: stableDetectionCount,
          timeSinceLastChange: timeSinceLastChange
        });
        
        setIsMobile(mobileDetected);
        lastDetectionTime = now;
        stableDetectionCount = 0;
        
        // If widget is expanded and mobile detection changes, update fullscreen state
        if (config?.floating && isExpanded && containerRef.current) {
          if (mobileDetected) {
            // Switched to mobile - enable fullscreen
            containerRef.current.classList.add('mobile-fullscreen');
            notifyParent('MOBILE_FULLSCREEN_ENABLE', { 
              isMobile: true,
              fullscreen: true 
            });
            console.log('🔄 Resize: Mobile fullscreen enabled');
          } else {
            // Switched to desktop - disable fullscreen
            containerRef.current.classList.remove('mobile-fullscreen');
            notifyParent('MOBILE_FULLSCREEN_DISABLE', { 
              isMobile: false,
              fullscreen: false 
            });
            console.log('🔄 Resize: Mobile fullscreen disabled');
          }
        }
      } else if (mobileDetected !== isMobile) {
        console.log('📱 Mobile detection change ignored (stability check):', {
          detected: mobileDetected,
          current: isMobile,
          stableCount: stableDetectionCount,
          timeSinceLastChange: timeSinceLastChange
        });
      }
    };
    
    // Debounce resize events to avoid excessive calls
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150); // Slightly longer debounce
    };
    
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [isMobile, config, isExpanded]);
  
  // Handle PostMessage communication with parent
  useEffect(() => {
    function handleParentMessage(event) {
      const { type, data } = event.data;
      
      switch (type) {
        case 'WIDGET_CONFIG':
          setConfig(prev => ({ ...prev, ...data.config }));
          break;
          
        case 'UPDATE_CUSTOMIZATION':
          // Handle smooth customization updates from test page
          if (data?.allSettings) {
            console.log('🎨 Received customization update:', data);
            // Update the widget's styling in real-time
            if (containerRef.current) {
              const container = containerRef.current;
              const newSettings = data.allSettings;
              
              // Apply CSS custom properties immediately
              if (newSettings.primary_color) {
                container.style.setProperty('--primary-color', newSettings.primary_color);
              }
              if (newSettings.header_color) {
                container.style.setProperty('--header-color', newSettings.header_color);
              }
              if (newSettings.background_color) {
                container.style.setProperty('--background-color', newSettings.background_color);
              }
              if (newSettings.text_color) {
                container.style.setProperty('--text-color', newSettings.text_color);
              }
              if (newSettings.border_radius) {
                container.style.setProperty('--border-radius', `${newSettings.border_radius}px`);
              }
              if (newSettings.font_family) {
                container.style.setProperty('--font-family', newSettings.font_family);
                container.style.fontFamily = newSettings.font_family;
              }
              
              // Update header elements directly
              const headerTitle = container.querySelector('.header-title');
              if (headerTitle && newSettings.chatbot_name) {
                headerTitle.textContent = newSettings.chatbot_name;
              }
              
              // Update button and header backgrounds
              const toggleButton = container.querySelector('.widget-toggle-button');
              if (toggleButton && newSettings.primary_color) {
                toggleButton.style.background = `linear-gradient(135deg, ${newSettings.primary_color}, ${newSettings.primary_color}dd)`;
              }
              
              const header = container.querySelector('.widget-header');
              if (header && newSettings.header_color) {
                header.style.background = `linear-gradient(135deg, ${newSettings.header_color}, ${newSettings.header_color}dd)`;
              } else if (header && newSettings.primary_color) {
                header.style.background = `linear-gradient(135deg, ${newSettings.primary_color}, ${newSettings.primary_color}dd)`;
              }
            }
          }
          break;
          
        case 'EXPAND':
          if (config?.floating) {
            setIsExpanded(true);
            notifyParent('WIDGET_RESIZE', { expanded: true });
          }
          break;
          
        case 'COLLAPSE':
          if (config?.floating) {
            setIsExpanded(false);
            notifyParent('WIDGET_RESIZE', { expanded: false });
          }
          break;
          
        case 'TOGGLE':
          if (config?.floating) {
            const newExpanded = !isExpanded;
            setIsExpanded(newExpanded);
            notifyParent('WIDGET_RESIZE', { expanded: newExpanded });
          }
          break;
          
        case 'RESET':
          resetChat();
          break;
      }
    }
    
    window.addEventListener('message', handleParentMessage);
    
    // Notify parent when widget is ready
    notifyParent('WIDGET_READY', { config });
    
    return () => {
      window.removeEventListener('message', handleParentMessage);
    };
  }, [config, isExpanded, resetChat]);
  
  // CRITICAL FIX: Apply mobile-fullscreen class when mobile detection changes or widget state changes
  useEffect(() => {
    if (containerRef.current && config && isMobile) {
      // Apply mobile-fullscreen class immediately if widget should be fullscreen
      if ((config.floating && isExpanded) || !config.floating) {
        containerRef.current.classList.add('mobile-fullscreen');
        console.log('🔧 FIXED: Mobile fullscreen class applied via state effect');
        
        if (config.floating) {
          notifyParent('MOBILE_FULLSCREEN_ENABLE', { 
            isMobile: true,
            fullscreen: true 
          });
        }
      }
    } else if (containerRef.current && !isMobile) {
      // Remove mobile-fullscreen class if not mobile
      containerRef.current.classList.remove('mobile-fullscreen');
      // Removed mobile fullscreen class
    }
  }, [isMobile, isExpanded, config]);

  // Send status updates when expanded state changes
  useEffect(() => {
    if (config?.floating) {
      console.log(`🔄 Widget toggling: ${isExpanded ? 'expanded' : 'collapsed'} (Mobile: ${isMobile})`);
      notifyParent('WIDGET_STATUS', { 
        expanded: isExpanded,
        floating: true,
        isMobile: isMobile,
        fullscreen: isMobile && isExpanded
      });
    }
  }, [isExpanded, config, isMobile]);
  
  // Toggle handler - mobile fullscreen only affects mobile devices
  const handleToggle = () => {
    if (config?.floating) {
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      
      // PERFORMANCE: Initialize settings only when widget opens (delayed initialization)
      if (newExpanded) {
        initializeSettings();
      }
      
      // CRITICAL FIX: Apply mobile fullscreen changes immediately on actual mobile devices
      if (isMobile && containerRef.current) {
        console.log('Applying mobile fullscreen:', { newExpanded, isMobile, containerClasses: containerRef.current.className });
        if (newExpanded) {
          // Apply mobile-fullscreen class immediately
          containerRef.current.classList.add('mobile-fullscreen');
          // Notify parent to make iframe fullscreen on mobile
          notifyParent('MOBILE_FULLSCREEN_ENABLE', { 
            isMobile: true,
            fullscreen: true 
          });
          console.log('🔧 FIXED: Mobile fullscreen enabled immediately, notified parent');
        } else {
          containerRef.current.classList.remove('mobile-fullscreen');
          // Notify parent to remove iframe fullscreen
          notifyParent('MOBILE_FULLSCREEN_DISABLE', { 
            isMobile: true,
            fullscreen: false 
          });
          console.log('Mobile fullscreen disabled');
        }
      } else {
        console.log('Mobile fullscreen not applied:', { isMobile, hasContainer: !!containerRef.current });
      }
      
      // Desktop behavior remains completely unchanged
      notifyParent('WIDGET_TOGGLE', { expanded: newExpanded });
    }
  };
  
  
  // Show error state
  if (settingsError) {
    return (
      <div className="widget-container">
        <div className="widget-error">
          <span className="error-icon">⚠️</span>
          <p>Failed to load widget</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  const handleClose = () => {
    // Close the widget and reset chat for next opening
    if (config?.floating) {
      setIsExpanded(false);
      
      // ONLY remove mobile fullscreen on mobile devices
      if (isMobile && containerRef.current) {
        containerRef.current.classList.remove('mobile-fullscreen');
        // Notify parent to remove iframe fullscreen
        notifyParent('MOBILE_FULLSCREEN_DISABLE', { 
          isMobile: true,
          fullscreen: false 
        });
      }
      
      resetChat(); // Clear conversation
      notifyParent('WIDGET_CLOSED_AND_RESET');
    }
  };
  // Handle escape key to close mobile fullscreen (mobile only)
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isMobile && isExpanded && config?.floating) {
        handleClose();
      }
    };
    
    // Only add escape key listener on mobile devices
    if (isMobile && isExpanded) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isMobile, isExpanded, config?.floating]);
  
  // Apply custom CSS variables for theming
  const applyCustomStyling = () => {
    if (containerRef.current && settings) {
      const container = containerRef.current;
      
      // Apply CSS custom properties for dynamic theming
      if (settings.primary_color) {
        container.style.setProperty('--primary-color', settings.primary_color);
      }
      if (settings.header_color) {
        container.style.setProperty('--header-color', settings.header_color);
      }
      if (settings.background_color) {
        container.style.setProperty('--background-color', settings.background_color);
      }
      if (settings.text_color) {
        container.style.setProperty('--text-color', settings.text_color);
      }
      if (settings.border_radius) {
        container.style.setProperty('--border-radius', `${settings.border_radius}px`);
      }
      if (settings.font_family) {
        container.style.setProperty('--font-family', settings.font_family);
      }
    }
  };

  // Apply immediate styling on mount to prevent flash of default styles
  useEffect(() => {
    // Apply styling as soon as the container and config are available
    if (containerRef.current && config) {
      const container = containerRef.current;
      
      // Get URL parameters for immediate styling (before settings load)
      const urlParams = new URLSearchParams(window.location.search);
      
      const immediateStyles = {
        primary_color: urlParams.get('primary_color'),
        header_color: urlParams.get('header_color'), 
        background_color: urlParams.get('background_color'),
        text_color: urlParams.get('text_color'),
        border_radius: urlParams.get('border_radius'),
        font_family: urlParams.get('font_family'),
        chatbot_name: urlParams.get('chatbot_name')
      };
      
      // Apply immediate styles to prevent flash
      if (immediateStyles.primary_color) {
        container.style.setProperty('--primary-color', immediateStyles.primary_color);
      }
      if (immediateStyles.header_color) {
        container.style.setProperty('--header-color', immediateStyles.header_color);
      }
      if (immediateStyles.background_color) {
        container.style.setProperty('--background-color', immediateStyles.background_color);
      }
      if (immediateStyles.text_color) {
        container.style.setProperty('--text-color', immediateStyles.text_color);
      }
      if (immediateStyles.border_radius) {
        container.style.setProperty('--border-radius', `${immediateStyles.border_radius}px`);
      }
      if (immediateStyles.font_family) {
        container.style.setProperty('--font-family', immediateStyles.font_family);
        container.style.fontFamily = immediateStyles.font_family;
      }
      
      // Update header title immediately if available
      setTimeout(() => {
        const headerTitle = container.querySelector('.header-title');
        if (headerTitle && immediateStyles.chatbot_name) {
          headerTitle.textContent = immediateStyles.chatbot_name;
        }
        
        // Apply immediate styling to interactive elements
        const toggleButton = container.querySelector('.widget-toggle-button');
        if (toggleButton && immediateStyles.primary_color) {
          toggleButton.style.background = `linear-gradient(135deg, ${immediateStyles.primary_color}, ${immediateStyles.primary_color}dd)`;
        }
        
        const header = container.querySelector('.widget-header');
        if (header) {
          if (immediateStyles.header_color) {
            header.style.background = `linear-gradient(135deg, ${immediateStyles.header_color}, ${immediateStyles.header_color}dd)`;
          } else if (immediateStyles.primary_color) {
            header.style.background = `linear-gradient(135deg, ${immediateStyles.primary_color}, ${immediateStyles.primary_color}dd)`;
          }
        }
      }, 0);
    }
  }, [config]); // Run when config is set
  
  // Apply styling whenever settings change
  React.useEffect(() => {
    applyCustomStyling();
  }, [settings]);
  
  // Get URL params for immediate styling
  const getImmediateStyles = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      '--primary-color': urlParams.get('primary_color') || settings?.primary_color || '#ea580c',
      '--header-color': urlParams.get('header_color') || settings?.header_color || urlParams.get('primary_color') || settings?.primary_color || '#ea580c',
      '--background-color': urlParams.get('background_color') || settings?.background_color || '#ffffff',
      '--text-color': urlParams.get('text_color') || settings?.text_color || '#1f2937',
      '--border-radius': `${urlParams.get('border_radius') || settings?.border_radius || '8'}px`,
      '--font-family': urlParams.get('font_family') || settings?.font_family || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontFamily: urlParams.get('font_family') || settings?.font_family || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    };
  };

  // Main render logic - mobile-fullscreen class only added on mobile devices
  return (
    <div 
      ref={containerRef}
      className={`widget-container ${config?.floating ? 'floating' : 'inline'} ${isExpanded ? 'expanded' : 'collapsed'}`}
      style={getImmediateStyles()}
    >
      {config?.testMode && (
        <div className="test-badge">TEST</div>
      )}
      
      {/* Floating mode: toggle button when collapsed */}
      {config?.floating && !isExpanded && (
        <div className="toggle-button-container">
          <button
            className="widget-toggle-button"
            onClick={handleToggle}
            title="Open chat"
            aria-label="Open chat widget"
            style={{
              background: (() => {
                const urlParams = new URLSearchParams(window.location.search);
                const color = urlParams.get('primary_color') || settings?.primary_color || '#ea580c';
                return `linear-gradient(135deg, ${color}, ${color}dd)`;
              })()
            }}
          >
            <ChatToggleIcon />
          </button>
        </div>
      )}
      
      {/* Chat interface when expanded (or always for inline) */}
      {(isExpanded || !config?.floating) && (
        <div className="widget-chat-container">
          {/* Header - always show initially, hide only for desktop inline */}
          {(!config || config.floating || config.testMode || isMobile) && (
            <div 
              className="widget-header"
              style={{
                background: (() => {
                  const urlParams = new URLSearchParams(window.location.search);
                  const headerColor = urlParams.get('header_color') || settings?.header_color;
                  const primaryColor = urlParams.get('primary_color') || settings?.primary_color || '#ea580c';
                  const color = headerColor || primaryColor;
                  return `linear-gradient(135deg, ${color}, ${color}dd)`;
                })()
              }}
            >
              <div className="header-content">
              <div className="header-info">
                <h3 className="header-title">
                  {(() => {
                    const urlParams = new URLSearchParams(window.location.search);
                    return urlParams.get('chatbot_name') || settings?.company_name || 'Chat Support';
                  })()}
                </h3>
                <p className="header-subtitle">
                  {isTyping ? 'AI is typing...' : 'We\'re here to help!'}
                </p>
              </div>
              {/* Controls only for floating widgets */}
              {config?.floating && (
                <div className="header-controls">
                  <button 
                    className="header-control-button"
                    onClick={handleToggle}
                    title="Minimize chat"
                    aria-label="Minimize chat widget"
                  >
                    <MinusIcon />
                  </button>
                  <button 
                    className="header-control-button"
                    onClick={handleClose}
                    title="Close chat"
                    aria-label="Close chat and start fresh"
                  >
                    <CloseIcon />
                  </button>
                </div>
              )}
              </div>
            </div>
          )}
          
          {/* NEW: Use TabbedChatWidget instead of ChatInterface */}
          <TabbedChatWidget
            messages={messages}
            isTyping={isTyping}
            onSendMessage={sendMessage}
            settings={settings}
            error={chatError}
          />
        </div>
      )}
    </div>
  );
};

// Icon components
const ChatToggleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <path d="M13 8H7"/>
    <path d="M17 12H7"/>
  </svg>
);

const MinusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default WidgetApp;