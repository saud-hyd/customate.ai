import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import SectionContainer from '../components/ui/SectionContainer';
import Button from '../components/ui/Button';

const CheckoutSuccessPage = () => {
  const location = useLocation();
  const [planDetails, setPlanDetails] = useState({
    plan: 'professional',
    billingCycle: 'annual'
  });
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Get plan details from location state
    if (location.state && location.state.plan) {
      setPlanDetails({
        plan: location.state.plan,
        billingCycle: location.state.billingCycle || 'annual'
      });
    }

    // Auto-redirect countdown
    const timer = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount <= 1) {
          clearInterval(timer);
          // Redirect to dashboard
          window.location.href = 'https://app.customate.ai/dashboard';
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [location.state]);

  // Plan name mapping
  const planNames = {
    basic: 'Basic',
    professional: 'Professional',
    enterprise: 'Enterprise'
  };

  return (
    <>
      <Helmet>
        <title>Purchase Successful | Customate.ai</title>
        <meta 
          name="description" 
          content="Your Customate.ai subscription has been successfully activated. Get started with your AI chatbot now." 
        />
      </Helmet>
      
      <SectionContainer background="light" paddingY="py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Purchase Successful!
            </h1>
            
            <p className="text-xl text-gray-600 mb-6">
              Thank you for subscribing to the {planNames[planDetails.plan]} plan. Your account has been activated.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Your Subscription Details
              </h2>
              
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-gray-500">Plan</p>
                  <p className="font-medium">{planNames[planDetails.plan]}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Billing</p>
                  <p className="font-medium capitalize">{planDetails.billingCycle}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium text-green-600">Active</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Next Steps</p>
                  <p className="font-medium">Complete Setup</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                You will be automatically redirected to your dashboard in {countdown} seconds.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Button
                  as="a"
                  href="https://app.customate.ai/dashboard"
                  variant="primary"
                  size="lg"
                >
                  Go to Dashboard
                </Button>
                
                <Button
                  as={Link}
                  to="/"
                  variant="outline"
                  size="lg"
                >
                  Back to Home
                </Button>
              </div>
            </div>
            
            <div className="mt-8 border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-500">
                A confirmation email has been sent to your email address with receipt and plan details.
                If you have any questions or need assistance, please <a href="/contact" className="text-primary-600 hover:text-primary-500">contact our support team</a>.
              </p>
            </div>
          </div>
        </div>
      </SectionContainer>
    </>
  );
};

export default CheckoutSuccessPage;