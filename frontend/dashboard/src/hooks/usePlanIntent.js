import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const usePlanIntent = () => {
  const location = useLocation();
  const [planIntent, setPlanIntent] = useState(null);

  useEffect(() => {
    // Check URL parameters for plan intent
    const urlParams = new URLSearchParams(location.search);
    const plan = urlParams.get('plan');
    const billing = urlParams.get('billing');
    const intent = urlParams.get('intent');

    if (plan && intent === 'upgrade') {
      const planIntentData = {
        plan: plan,
        billing: billing || 'monthly',
        timestamp: Date.now()
      };

      // Store in localStorage for persistence across pages
      localStorage.setItem('planIntent', JSON.stringify(planIntentData));
      setPlanIntent(planIntentData);

      // Clean URL parameters
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } else {
      // Check if there's a stored plan intent
      const storedIntent = localStorage.getItem('planIntent');
      if (storedIntent) {
        const parsedIntent = JSON.parse(storedIntent);
        // Only use if it's recent (within 1 hour)
        if (Date.now() - parsedIntent.timestamp < 3600000) {
          setPlanIntent(parsedIntent);
        } else {
          localStorage.removeItem('planIntent');
        }
      }
    }
  }, [location]);

  const clearPlanIntent = () => {
    localStorage.removeItem('planIntent');
    setPlanIntent(null);
  };

  return { planIntent, clearPlanIntent };
};