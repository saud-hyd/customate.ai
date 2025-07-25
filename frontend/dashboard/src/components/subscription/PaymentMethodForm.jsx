import React, { useState } from 'react';
import Button from '../common/Button';

const PaymentMethodForm = ({ onSubmit, processing, onCancel }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [errors, setErrors] = useState({});

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Format expiry date as MM/YY
  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (v.length > 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    
    return v;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    
    if (!cardNumber.trim()) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cardNumber.replace(/\s+/g, '').length < 16) {
      newErrors.cardNumber = 'Please enter a valid card number';
    }
    
    if (!expiryDate.trim()) {
      newErrors.expiryDate = 'Expiry date is required';
    } else if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      newErrors.expiryDate = 'Please enter a valid expiry date (MM/YY)';
    }
    
    if (!cvc.trim()) {
      newErrors.cvc = 'CVC is required';
    } else if (!/^\d{3,4}$/.test(cvc)) {
      newErrors.cvc = 'Please enter a valid CVC';
    }
    
    if (!cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      // In a real implementation, this would use a payment processor like Stripe
      // For this example, we'll simulate creating a payment method
      const paymentMethodId = `pm_${Date.now()}`;
      onSubmit(paymentMethodId);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700">
          Cardholder Name
        </label>
        <input
          type="text"
          id="cardholderName"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
            errors.cardholderName ? 'border-red-300' : ''
          }`}
          placeholder="Jane Smith"
        />
        {errors.cardholderName && (
          <p className="mt-1 text-sm text-red-600">{errors.cardholderName}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700">
          Card Number
        </label>
        <input
          type="text"
          id="cardNumber"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
            errors.cardNumber ? 'border-red-300' : ''
          }`}
          placeholder="4242 4242 4242 4242"
          maxLength="19"
        />
        {errors.cardNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.cardNumber}</p>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700">
            Expiry Date
          </label>
          <input
            type="text"
            id="expiryDate"
            value={expiryDate}
            onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
            className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
              errors.expiryDate ? 'border-red-300' : ''
            }`}
            placeholder="MM/YY"
            maxLength="5"
          />
          {errors.expiryDate && (
            <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="cvc" className="block text-sm font-medium text-gray-700">
            CVC
          </label>
          <input
            type="text"
            id="cvc"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, ''))}
            className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
              errors.cvc ? 'border-red-300' : ''
            }`}
            placeholder="123"
            maxLength="4"
          />
          {errors.cvc && (
            <p className="mt-1 text-sm text-red-600">{errors.cvc}</p>
          )}
        </div>
      </div>
      
      <div className="pt-4 flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={processing}
        >
          {processing ? 'Processing...' : 'Add Payment Method'}
        </Button>
      </div>
    </form>
  );
};

export default PaymentMethodForm;