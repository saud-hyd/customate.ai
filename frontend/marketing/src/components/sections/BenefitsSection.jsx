// src/components/sections/BenefitsSection.jsx
import React from 'react';

const BenefitsSection = () => {
  return (
    <section className="frame3">
      <div className="frame3-container">
        <h2 className="frame3-title">Benefits</h2>
        <div className="benefits-container">
          {/* Line 1: 3 cards */}
          <div className="benefits-row row1">
            <div className="benefit-card top-service">
              <h3>Top Service</h3>
              <p>
                Offer reliable, scalable, and uninterrupted customer service with
                always clear and accurate information.
              </p>
            </div>
            <div className="benefit-card lowest-time">
              <h3>Lowest Time to Resolution</h3>
              <p>
                Avoid delays. Your customers get immediate answers 24/7 without
                waiting for an agent.
              </p>
            </div>
            <div className="benefit-card multichannel">
              <h3>Multichannel Support</h3>
              <p>
                Not just a chatbot widget – our solution works on email, Facebook,
                WhatsApp, and more. (Telephone channel coming soon.)
              </p>
            </div>
          </div>

          {/* Line 2: 2 horizontal boxes */}
          <div className="benefits-row row2">
            <div className="benefit-card horizontal reduce-expenses">
              <h3>Reduce Expenses</h3>
              <p>
                Pay much less for support staff or free up your employees for more
                productive activities.
              </p>
            </div>
            <div className="benefit-card horizontal increase-income">
              <h3>Increase Income</h3>
              <p>
                Get leads, feedback, and key information to boost your sales and
                improve your customer service.
              </p>
            </div>
          </div>

          {/* Line 3: 3 cards */}
          <div className="benefits-row row3">
            <div className="benefit-card integrations">
              <h3>Integrations</h3>
              <p>
                We adapt to you. Connect the applications you use to run your
                operations to our portal. We retrieve only relevant information.
              </p>
            </div>
            <div className="benefit-card advanced-ai">
              <h3>Advanced AI Analysis</h3>
              <p>
                Through our proprietary machine learning model, we offer optimal
                information processing and outputs.
              </p>
            </div>
            <div className="benefit-card continuous-learning">
              <h3>Continuous Learning</h3>
              <p>
                Your Customate Bot evolves alongside the development of your
                knowledge base.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;