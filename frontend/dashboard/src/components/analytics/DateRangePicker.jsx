// Path: frontend/dashboard/src/components/analytics/DateRangePicker.jsx
import React, { useState } from 'react';
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Date Range Picker Component
 * Provides pre-defined date ranges and custom date selection
 */
const DateRangePicker = ({ currentRange, onRangeSelect, onClose }) => {
  const [customStartDate, setCustomStartDate] = useState(
    currentRange.start ? formatDateForInput(currentRange.start) : ''
  );
  const [customEndDate, setCustomEndDate] = useState(
    currentRange.end ? formatDateForInput(currentRange.end) : ''
  );

  // Pre-defined date ranges
  const predefinedRanges = [
    { label: 'Today', days: 1 },
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 },
    { label: 'Custom Range', days: null }
  ];

  // Format date for input field (YYYY-MM-DD)
  function formatDateForInput(date) {
    if (!date) return '';
    const d = new Date(date);
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  // Handle pre-defined range selection
  const handleRangeSelect = (days) => {
    if (days) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - (days - 1)); // -1 because today counts as 1
      
      const range = {
        start,
        end,
        days,
        label: predefinedRanges.find(r => r.days === days)?.label
      };
      
      onRangeSelect(range);
    }
  };

  // Handle custom range selection
  const handleCustomRangeSelect = () => {
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      
      // Calculate days between
      const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      const range = {
        start,
        end,
        days,
        label: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
      };
      
      onRangeSelect(range);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Select Date Range</h3>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-500"
          onClick={onClose}
        >
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Predefined ranges */}
      <div className="space-y-2 mb-6">
        {predefinedRanges.filter(range => range.days !== null).map((range) => (
          <button
            key={range.label}
            type="button"
            className={`w-full text-left px-4 py-2 rounded-md ${
              currentRange.days === range.days
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => handleRangeSelect(range.days)}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Range</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start-date" className="block text-xs text-gray-500 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              max={customEndDate || formatDateForInput(new Date())}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-xs text-gray-500 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              min={customStartDate}
              max={formatDateForInput(new Date())}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={!customStartDate || !customEndDate}
          className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
          onClick={handleCustomRangeSelect}
        >
          <CalendarIcon className="-ml-1 mr-2 h-5 w-5" />
          Apply Custom Range
        </button>
      </div>
    </div>
  );
};

export default DateRangePicker;