import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import SectionContainer from '../components/ui/SectionContainer';
import Button from '../components/ui/Button';

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: ''
  });

  // Plans data
  const plans = {
    basic: {
      name: 'Basic',
      monthly: 39,
      annually: 29,
      features: [
        '5,000 messages per month',
        '25 active users',
        '500 MB storage',
        '10 knowledge collections',
        'Custom branding',
        'Email support'
      ]
    },
    professional: {
      name: 'Professional',
      monthly: 129,
      annually: 99,
      features: [
        '20,000 messages per month',
        '100 active users',
        '2 GB storage',
        '50 knowledge collections',
        'Advanced customization',
        'Priority support',
        'Team collaboration'
      ]
    },
    enterprise: {
      name: 'Enterprise',
      monthly: 449,
      annually: 349,
      features: [
        '100,000 messages per month',
        '500 active users',
        '10 GB storage',
        '250 knowledge collections',
        'Custom deployment options',
        'Dedicated account manager',
        'Phone & email support'
      ]
    }
  };

  // Parse query parameters to get the selected plan
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const plan = params.get('plan');
    const cycle = params.get('billing') || 'annual';
    
    if (plan && plans[plan]) {
      setSelectedPlan(plan);
    } else {
      // Default to professional if no valid plan specified
      setSelectedPlan('professional');
    }
    
    setBillingCycle(cycle === 'monthly' ? 'monthly' : 'annual');
  }, [location.search]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // In a real implementation, integrate with Stripe or another payment processor
      // const response = await paymentService.processPayment({
      //   plan: selectedPlan,
      //   billingCycle,
      //   ...formData
      // });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // After successful payment, redirect to success page
      navigate('/checkout/success', { 
        state: { 
          plan: selectedPlan,
          billingCycle
        } 
      });
    } catch (err) {
      console.error('Payment processing error:', err);
      setError('There was an error processing your payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If no plan is selected yet (still loading), show loading state
  if (!selectedPlan) {
    return (
      <SectionContainer background="light" paddingY="py-20">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </SectionContainer>
    );
  }

  const plan = plans[selectedPlan];
  const price = billingCycle === 'monthly' ? plan.monthly : plan.annually;
  const billingLabel = billingCycle === 'monthly' ? 'month' : 'month, billed annually';

  return (
    <>
      <Helmet>
        <title>Checkout - {plan.name} Plan | Customate.ai</title>
        <meta 
          name="description" 
          content={`Complete your Customate.ai ${plan.name} plan purchase. Secure checkout process.`} 
        />
      </Helmet>
      
      <SectionContainer background="light" paddingY="py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Complete Your Purchase
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              You're just a few steps away from creating your custom chatbot
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="grid md:grid-cols-5">
              {/* Order Summary */}
              <div className="md:col-span-2 bg-gray-50 p-6 border-r border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Order Summary</h2>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium">{plan.name}</span>
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Billing</span>
                  <span className="font-medium capitalize">{billingCycle}</span>
                </div>
                
                <div className="border-t border-gray-200 my-4 pt-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${price}/mo</span>
                  </div>
                  
                  {billingCycle === 'annual' && (
                    <div className="flex justify-between items-center mb-1 text-green-600">
                      <span>Annual discount</span>
                      <span>Save 20%</span>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-gray-200 my-4 pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span>${price}/{billingLabel}</span>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="font-medium mb-2">Plan includes:</h3>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="ml-2 text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">
                    Questions? <a href="/contact" className="text-primary-600 hover:text-primary-500">Contact our sales team</a>
                  </p>
                </div>
              </div>
              
              {/* Payment Form */}
              <div className="md:col-span-3 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Your Information</h2>
                
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="mb-6 bg-red-50 p-4 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First name</label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last name</label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700">Company name</label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700">State / Province</label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="zip" className="block text-sm font-medium text-gray-700">ZIP / Postal code</label>
                      <input
                        type="text"
                        id="zip"
                        name="zip"
                        value={formData.zip}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country</label>
                      <select
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="UK">United Kingdom</option>
                        <option value="AU">Australia</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        {/* Add more countries as needed */}
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
                    
                    <div className="mt-1 bg-gray-50 p-4 border border-gray-200 rounded-md">
                      <div className="mb-4">
                        <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700">Card number</label>
                        <input
                          type="text"
                          id="cardNumber"
                          name="cardNumber"
                          placeholder="•••• •••• •••• ••••"
                          value={formData.cardNumber}
                          onChange={handleInputChange}
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="cardExpiry" className="block text-sm font-medium text-gray-700">Expiration date</label>
                          <input
                            type="text"
                            id="cardExpiry"
                            name="cardExpiry"
                            placeholder="MM/YY"
                            value={formData.cardExpiry}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="cardCvc" className="block text-sm font-medium text-gray-700">CVC</label>
                          <input
                            type="text"
                            id="cardCvc"
                            name="cardCvc"
                            placeholder="•••"
                            value={formData.cardCvc}
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="terms"
                          name="terms"
                          type="checkbox"
                          required
                          className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="terms" className="font-medium text-gray-700">
                          I agree to the 
                          <a href="/terms" className="text-primary-600 hover:text-primary-500"> Terms of Service </a> 
                          and 
                          <a href="/privacy" className="text-primary-600 hover:text-primary-500"> Privacy Policy</a>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        `Complete Purchase`
                      )}
                    </Button>
                    
                    <p className="mt-4 text-center text-sm text-gray-500">
                      Your subscription will begin immediately after payment is processed.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </SectionContainer>
    </>
  );
};

export default CheckoutPage;