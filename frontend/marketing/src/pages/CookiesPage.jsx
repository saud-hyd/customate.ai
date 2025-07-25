import React from 'react';
import { Helmet } from 'react-helmet';

const CookiesPage = () => {
  return (
    <>
      <Helmet>
        <title>Cookie Policy - Customate.ai</title>
        <meta name="description" content="Cookie Policy for Customate.ai - Learn about how we use cookies and tracking technologies." />
      </Helmet>
      
      <div className="min-h-screen bg-white">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
            <p className="text-lg text-gray-600">Last updated: January 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="prose prose-lg max-w-none">
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. What Are Cookies?</h2>
              <p className="text-gray-700 mb-4">
                Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They help websites remember information about your visit, which can make it easier to visit the site again and make the site more useful to you.
              </p>
              <p className="text-gray-700 mb-6">
                At Customate.ai, we use cookies and similar tracking technologies to enhance your experience on our website, analyze usage patterns, and improve our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Types of Cookies We Use</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-orange-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-gray-800 mb-3">Essential Cookies</h3>
                  <p className="text-gray-700 mb-3">
                    These cookies are necessary for the operation of our service and allow basic functions such as:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 text-sm">
                    <li>Logging in to your account</li>
                    <li>Accessing secure areas</li>
                    <li>Maintaining session state</li>
                    <li>Security features</li>
                  </ul>
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>Duration:</strong> Session cookies (deleted when you close your browser) or up to 1 year
                  </div>
                </div>

                <div className="bg-orange-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-gray-800 mb-3">Performance Cookies</h3>
                  <p className="text-gray-700 mb-3">
                    These cookies collect anonymous data about how you interact with our service:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 text-sm">
                    <li>Page views and navigation patterns</li>
                    <li>Time spent on pages</li>
                    <li>Error messages encountered</li>
                    <li>Performance metrics</li>
                  </ul>
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>Duration:</strong> Up to 2 years
                  </div>
                </div>

                <div className="bg-orange-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-gray-800 mb-3">Functionality Cookies</h3>
                  <p className="text-gray-700 mb-3">
                    These cookies enable the service to remember your preferences:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 text-sm">
                    <li>Language preferences</li>
                    <li>Theme settings</li>
                    <li>Chat history (when enabled)</li>
                    <li>Customization options</li>
                  </ul>
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>Duration:</strong> Up to 1 year
                  </div>
                </div>

                <div className="bg-orange-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-gray-800 mb-3">Analytics Cookies</h3>
                  <p className="text-gray-700 mb-3">
                    These cookies help us understand how our website is being used:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 text-sm">
                    <li>User behavior analysis</li>
                    <li>Traffic sources</li>
                    <li>Popular content identification</li>
                    <li>Conversion tracking</li>
                  </ul>
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>Duration:</strong> Up to 2 years
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Purpose of Tracking</h2>
              
              <div className="space-y-4">
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Analytics</h3>
                  <p className="text-gray-700">We use cookies to gather data on how you interact with our service, helping us analyze trends, monitor platform usage, and improve the overall user experience.</p>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Functionality</h3>
                  <p className="text-gray-700">These cookies allow our service to remember your choices (such as language or region) and provide more personalized features and improved usability.</p>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Security</h3>
                  <p className="text-gray-700">Cookies help us detect and prevent security threats, authenticate users, and protect against unauthorized access to your account.</p>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">AI Service Improvement</h3>
                  <p className="text-gray-700">We use tracking data to understand how users interact with our AI chatbots, helping us improve response accuracy and user satisfaction.</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Control and Opt-Out Options</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">4.1 Browser Settings</h3>
              <p className="text-gray-700 mb-4">
                You can control cookies and tracking technologies through your browser settings:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li><strong>Accept or reject cookies:</strong> You can adjust your browser settings to accept or reject cookies entirely.</li>
                <li><strong>Delete cookies:</strong> You can delete cookies from your device at any time through your browser settings.</li>
                <li><strong>Block third-party cookies:</strong> Most browsers allow you to block third-party cookies while still accepting first-party cookies.</li>
                <li><strong>Private browsing:</strong> Use incognito or private browsing mode to prevent cookies from being stored.</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.2 Cookie Consent Management</h3>
              <p className="text-gray-700 mb-4">
                When you first visit our website, you'll see a cookie consent banner that allows you to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>Accept all cookies</li>
                <li>Accept only essential cookies</li>
                <li>Customize your cookie preferences by category</li>
                <li>Learn more about each type of cookie we use</li>
              </ul>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Please Note</h4>
                    <p className="text-sm text-yellow-700">Disabling certain cookies may affect the functionality of our service. Essential cookies cannot be disabled as they are necessary for the basic operation of our platform.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Third-Party Services</h2>
              <p className="text-gray-700 mb-4">
                We may use third-party services that set their own cookies. These services include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Analytics providers:</strong> To understand website usage and performance</li>
                <li><strong>Content delivery networks (CDNs):</strong> To deliver content efficiently</li>
                <li><strong>Payment processors:</strong> To handle secure transactions</li>
                <li><strong>Support chat services:</strong> To provide customer assistance</li>
              </ul>
              <p className="text-gray-700 mb-6">
                These third-party services have their own privacy policies and cookie practices. We encourage you to review their policies to understand how they use cookies and tracking technologies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                Different types of cookies are retained for different periods:
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-orange-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Cookie Type</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Retention Period</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-700">Session Cookies</td>
                      <td className="px-6 py-4 text-sm text-gray-700">Until browser is closed</td>
                      <td className="px-6 py-4 text-sm text-gray-700">Maintain login state and session data</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-700">Persistent Cookies</td>
                      <td className="px-6 py-4 text-sm text-gray-700">Up to 2 years</td>
                      <td className="px-6 py-4 text-sm text-gray-700">Remember preferences and settings</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-700">Analytics Cookies</td>
                      <td className="px-6 py-4 text-sm text-gray-700">Up to 2 years</td>
                      <td className="px-6 py-4 text-sm text-gray-700">Website performance and usage analysis</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Updates to This Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Cookie Policy from time to time to reflect changes in our practices or applicable laws. When we make significant changes, we will notify you by:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Posting a notice on our website</li>
                <li>Sending an email notification (if you have an account)</li>
                <li>Updating the "Last updated" date at the top of this policy</li>
              </ul>
              <p className="text-gray-700 mb-6">
                We encourage you to review this Cookie Policy periodically to stay informed about how we use cookies and tracking technologies.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default CookiesPage;