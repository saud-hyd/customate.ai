import React from 'react';
import { Helmet } from 'react-helmet';

const TermsPage = () => {
  return (
    <>
      <Helmet>
        <title>Terms and Conditions - Customate.ai</title>
        <meta name="description" content="Terms and Conditions governing the use of Customate.ai services." />
      </Helmet>
      
      <div className="min-h-screen bg-white">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms and Conditions</h1>
            <p className="text-lg text-gray-600">Last updated: January 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="prose prose-lg max-w-none">
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">1.1 Purpose of the Terms and Conditions</h3>
              <p className="text-gray-700 mb-4">
                These Terms and Conditions (the "Agreement") govern the use of the service provided by Customate S&A UG (from now on, "Customate") and outline the rights and obligations of users and the service provider. By visiting our website, engaging in consultations, and accessing or using our service, you agree to be bound by these terms.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">1.2 Scope of Application</h3>
              <p className="text-gray-700 mb-6">
                These terms apply to all users who access, use, or interact with our service, whether as individuals, businesses, or third parties. They govern all activities within our platform, including any associated features, content, and tools.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. User Registration and Accounts</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Account Creation and Eligibility</h3>
              <p className="text-gray-700 mb-4">
                To use our service, Customer must create an account by providing accurate and complete information. Customer must be at least 18 years old or have the legal capacity to enter into a contract. By registering, Customer confirms eligibility to use our service.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.2 Responsibilities of the User</h3>
              <p className="text-gray-700 mb-4">
                Customers are responsible for maintaining the confidentiality of their account credentials, including their username and password. Customer is solely responsible for the accuracy, content and legality of all Customer Data. Customer specifically agrees not to use the Services to collect, store, process or transmit any Sensitive Personal Information. Customer agree to use the service in a responsible and ethical way, in compliance with these Terms and Conditions and all applicable laws.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.3 Account Security</h3>
              <p className="text-gray-700 mb-6">
                Customer is required to implement appropriate measures to protect their accounts. Customer must notify the service provider immediately if any unauthorized access to their account is suspected.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Payment</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">3.1 Subscription Plans and Fees</h3>
              <p className="text-gray-700 mb-4">
                The Customer agrees to the subscription plans and associated fees as specified on the service's website or agreed upon in a separate contract, and set in the applicable Order Form. Additionally, the customer may have a credit balance if they exceed the usage limit set in the basic subscription plan. Any change in pricing will be communicated in advance, and will be automatically billed, unless the customer cancels the subscription.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">3.2 Payment Methods and Conditions</h3>
              <p className="text-gray-700 mb-4">
                Customer may pay for the service using the following payment methods: credit cards (with a 2% increase in price) and direct bank account transfers. Payments must be made in advance, unless otherwise stated in the contract.
              </p>
              <p className="text-gray-700 mb-6">
                If Customer is purchasing the Services via credit card, debit card or any other recurring payment method accepted by Customate, Recurring Billing is authorized, Customer pays any foreign transaction fees, and is responsible for any change in the payment method information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Service Usage</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">4.1 Permitted Use</h3>
              <p className="text-gray-700 mb-4">
                The Customer may access and utilize the service solely for its intended purpose. Use of and access to the Services is permitted only by Permitted Users. This is a subscription agreement for access to and use of the Services. Customer acknowledges that it is obtaining only a limited right to the Services and that no ownership rights are being conveyed to Customer under this Agreement.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.2 Prohibited Activities</h3>
              <p className="text-gray-700 mb-4">The Customer and all users are strictly prohibited from:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Using the service for unlawful, fraudulent, or deceptive purposes</li>
                <li>Manipulating, or attempting to exploit the AI system beyond its intended function</li>
                <li>Deploying the chatbot in a manner that promotes hate speech, violence, or illegal content</li>
                <li>Exceeding fair use policies that may impact system stability or degrade service for other users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Liability and Warranties</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">5.1 Service Guarantees and Limitations</h3>
              <p className="text-gray-700 mb-4">
                The service is provided on an "as-is" and "as-available" basis. While the provider strives for high availability and reliability, no guarantees are made regarding uninterrupted or error-free operation. The provider does not warrant that the service will meet all specific requirements or function without disruptions, bugs, or vulnerabilities.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">5.2 Liability Limitations</h3>
              <p className="text-gray-700 mb-6">
                The provider is only liable for damages caused by gross negligence or willful misconduct, as permitted by applicable law. Liability for indirect, incidental, or consequential damages—such as lost profits, data loss, or business interruptions—is excluded.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Termination and Cancellation</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">6.1 Cancellation by the User</h3>
              <p className="text-gray-700 mb-4">
                The Customer may cancel their subscription or account at any time by following the cancellation procedures provided in the service platform. Cancellation will take effect at the end of the current billing period, unless otherwise stated.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.2 Termination by the Provider</h3>
              <p className="text-gray-700 mb-6">
                The provider reserves the right to terminate or suspend the User's access to the service in the event of a breach of these Terms and Conditions, including but not limited to unauthorized usage, failure to make timely payments, or violation of applicable laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Governing Law</h2>
              <p className="text-gray-700 mb-4">
                These Terms and Conditions are governed by and construed in accordance with the laws of Germany, without regard to its conflict of law provisions. Any disputes that cannot be resolved through informal communication will be subject to the exclusive jurisdiction of the competent courts in Germany.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For any questions, concerns, or support requests regarding these Terms and Conditions, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700"><strong>Email:</strong> admin@customate.ai</p>
                <p className="text-gray-700"><strong>Address:</strong> August-Bebel-Str. 89 - Haus 7, 14482 Potsdam, Germany</p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </>
  );
};

export default TermsPage;