import React from 'react';

const SectionContainer = ({ 
  children, 
  className = '', 
  id,
  background = 'white',
  paddingY = 'py-16 md:py-24'
}) => {
  // Define different background styles
  const backgroundStyles = {
    white: 'bg-white',
    light: 'bg-gray-50',
    primary: 'bg-primary-50',
    gradient: 'bg-gradient-to-b from-white to-primary-50',
    dark: 'bg-secondary-900 text-white',
  };

  return (
    <section
      id={id}
      className={`${backgroundStyles[background]} ${paddingY} ${className}`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
};

export default SectionContainer;