import React, { useEffect, useRef } from 'react';
// If ChatWidget is exported as default:
import ChatWidget from './ChatWidget';
// If ChatWidget is a named export, use this instead:
// import { ChatWidget } from './ChatWidget';

import '../styles/widget.css';
import '../styles/themes.css';
import '../styles/animations.css';
import { setConfig } from '../config';

const WidgetComponent = ({ config }) => {
  const initialized = useRef(false);
  
  // Apply config when it changes
  useEffect(() => {
    if (config) {
      setConfig(config);
      initialized.current = true;
    }
  }, [config]);
  
  if (!initialized.current && !config) {
    return <div>Loading widget...</div>;
  }
  
  // Make sure ChatWidget is properly rendered
  return <div className="widget-container"><ChatWidget /></div>;
};

// Make sure we export WidgetComponent as default
export default WidgetComponent;