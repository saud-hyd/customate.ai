import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Button from '../common/Button';

// Import Stripe public key from environment variables
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_samplekey');

// Wrapper component that provides Stripe context
export const PaymentMethodFormWrapper = ({ onSubmit, processing, onCancel }) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodForm 
        onSubmit={onSubmit} 
        processing={processing} 
        onCancel={onCancel} 
      />
    </Elements>
  );
};

// Card input styles
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
  hidePostalCode: true,
};

// The form component that needs to be wrapped with Elements
const PaymentMethodForm = ({ onSubmit, processing, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
  });

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      return;
    }

    if (!cardComplete) {
      // Card details are not complete
      setError('Please complete your card information');
      return;
    }

    if (!billingDetails.name) {
      setError('Please provide your name');
      return;
    }

    // Clear any existing errors
    setError(null);

    // Create payment method
    const result = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
      billing_details: billingDetails,
    });

    if (result.error) {
      // Show error to customer
      setError(result.error.message);
    } else {
      // Send payment method to server
      onSubmit(result.paymentMethod.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Cardholder Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Jane Smith"
            required
            value={billingDetails.name}
            onChange={(e) => setBillingDetails({ ...billingDetails, name: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="jane.smith@example.com"
            value={billingDetails.email}
            onChange={(e) => setBillingDetails({ ...billingDetails, email: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="card" className="block text-sm font-medium text-gray-700">
            Card Information
          </label>
          <div className="mt-1 border border-gray-300 rounded-md shadow-sm py-3 px-3 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
            <CardElement
              id="card"
              options={cardElementOptions}
              onChange={(e) => setCardComplete(e.complete)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}

      <div className="flex justify-end space-x-3 mt-4">
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
          disabled={!stripe || processing || !cardComplete}
        >
          {processing ? 'Processing...' : 'Add Payment Method'}
        </Button>
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        Your payment information is securely processed by Stripe. We don't store your card details.
      </div>
    </form>
  );
};

// Default export with the wrapper
export default PaymentMethodFormWrapper;