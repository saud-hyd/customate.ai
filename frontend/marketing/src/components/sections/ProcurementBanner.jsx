import React from 'react';
import { Link } from 'react-router-dom';

const ProcurementBanner = () => {
  return (
    <div className="bg-purple-600 py-4">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <Link 
            to="/blog/competitive-advantage" 
            className="text-white hover:text-purple-200 transition-colors text-sm font-medium"
          >
Why us? If you are procuring software, click here to understand our unique value proposition and see how we compare to other providers.          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProcurementBanner;