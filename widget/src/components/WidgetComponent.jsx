// widget/src/components/WidgetComponent.jsx
import React from 'react';
import ChatWidget from './ChatWidget';
import '../styles/widget.css';
import '../styles/themes.css';
import '../styles/animations.css';
import { setConfig } from '../config';

const WidgetComponent = ({ config }) => {
  // Apply config
  if (config) {
    setConfig(config);
  }
  
  return <ChatWidget />;
};

export default WidgetComponent;