import React from 'react';

const ChannelStatusBadge = ({ status }) => {
  let badgeClasses = 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full';
  
  switch (status?.toLowerCase()) {
    case 'connected':
      badgeClasses += ' bg-green-100 text-green-800';
      break;
    case 'disconnected':
      badgeClasses += ' bg-red-100 text-red-800';
      break;
    case 'connecting':
      badgeClasses += ' bg-yellow-100 text-yellow-800';
      break;
    default:
      badgeClasses += ' bg-gray-100 text-gray-800';
  }
  
  return (
    <span className={badgeClasses}>
      {status || 'Unknown'}
    </span>
  );
};

export default ChannelStatusBadge;