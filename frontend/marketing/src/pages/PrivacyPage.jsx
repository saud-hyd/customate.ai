import React from 'react';
import { Helmet } from 'react-helmet';

const PrivacyPage = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - Customate.ai</title>
        <meta name="description" content="Privacy Policy and Data Protection information for Customate.ai services." />
      </Helmet>
      
      <div className="min-h-screen bg-white">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Data Protection and Privacy Policy</h1>
            <p className="text-lg text-gray-600">Last updated: January 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="prose prose-lg max-w-none">
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">1.1 Purpose of the Policy</h3>
              <p className="text-gray-700 mb-4">
                This Data Protection and Privacy Policy outlines how Customate collects, uses, and protects the User's personal data in compliance with the applicable data protection laws, including the General Data Protection Regulation (GDPR). Our goal is to ensure transparency regarding our data processing practices and to inform the User about their rights.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">1.2 Scope and Applicability</h3>
              <p className="text-gray-700 mb-6">
                This policy applies to all individuals who interact with our services, including users of any Customate service, website visitors, and clients. It covers all personal data collected during the User's interaction with the service, regardless of the platform or device used.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Data Collection and Processing</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Types of Data Collected</h3>
              <p className="text-gray-700 mb-4">We collect both personal and non-personal data from the User:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Personal Data:</strong> This may include, but is not limited to, the User's name, contact information (email, phone number), account credentials, communication records, and any other information directly provided during interactions with the service.</li>
                <li><strong>Non-Personal Data:</strong> This includes data such as usage statistics, technical information about the User's device, browsing patterns, IP address, and other anonymous data collected to improve service functionality and performance.</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.2 Methods of Data Collection</h3>
              <p className="text-gray-700 mb-4">Data is collected through various methods:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>User Input:</strong> Personal data provided directly by the User when creating an account, interacting with the chatbot, or submitting forms.</li>
                <li><strong>Automated Tracking:</strong> We may collect data automatically through cookies, analytics tools, and tracking technologies to monitor how the User interacts with our platform.</li>
                <li><strong>AI Interactions:</strong> As the User interacts with the AI-powered chatbot, data related to the conversation, queries, and responses may be logged for the purpose of improving the service, training the AI model, or providing better support.</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.3 Purpose of Data Processing</h3>
              <p className="text-gray-700 mb-4">The collected data is processed for the following purposes:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-6">
                <li>Providing the Service: To facilitate, manage, and improve the User's experience with the chatbot and related services.</li>
                <li>User Support: To assist with customer support queries, troubleshoot issues, and enhance service delivery.</li>
                <li>Service Improvement and Development: To analyze usage patterns, refine AI performance, and optimize features.</li>
                <li>Compliance and Legal Obligations: To comply with legal and regulatory requirements, including ensuring the security of personal data and preventing fraudulent activities.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Legal Basis for Processing (GDPR Compliance)</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Consent (Art. 6(1)(a) GDPR)</h3>
                  <p className="text-sm text-gray-700">Where consent is required, the User's explicit consent will be obtained before data collection or processing begins.</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Contract Performance (Art. 6(1)(b) GDPR)</h3>
                  <p className="text-sm text-gray-700">Personal data may be processed when necessary for the performance of a contract between the User and the service provider.</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Legitimate Interests (Art. 6(1)(f) GDPR)</h3>
                  <p className="text-sm text-gray-700">We may process personal data based on legitimate interests, provided these interests do not override the User's rights and freedoms.</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Legal Obligations (Art. 6(1)(c) GDPR)</h3>
                  <p className="text-sm text-gray-700">Personal data may be processed to comply with legal obligations, such as maintaining records for tax or regulatory purposes.</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Rights Under GDPR</h2>
              
              <div className="space-y-4">
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Right to Access (Art. 15 GDPR)</h3>
                  <p className="text-gray-700">The User has the right to request confirmation as to whether their personal data is being processed, and if so, to obtain a copy of the personal data along with relevant information about the processing activities.</p>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Right to Rectification (Art. 16 GDPR)</h3>
                  <p className="text-gray-700">The User has the right to request the correction of inaccurate or incomplete personal data held about them.</p>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Right to Erasure (Art. 17 GDPR)</h3>
                  <p className="text-gray-700">The User has the right to request the deletion of their personal data under certain conditions.</p>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Right to Data Portability (Art. 20 GDPR)</h3>
                  <p className="text-gray-700">The User has the right to receive their personal data in a structured, commonly used, and machine-readable format.</p>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Right to Object (Art. 21 GDPR)</h3>
                  <p className="text-gray-700">The User has the right to object to the processing of their personal data based on legitimate interests, direct marketing, or profiling.</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security Measures</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">5.1 Encryption and Secure Storage</h3>
              <p className="text-gray-700 mb-4">
                The service implements industry-standard encryption methods to protect personal data both during transmission (via SSL/TLS) and at rest (via encrypted storage systems). This ensures that sensitive information, such as User credentials and payment details, is secure from unauthorized access or interception.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">5.2 Access Controls and Authentication</h3>
              <p className="text-gray-700 mb-4">
                Access to personal data is restricted to authorized personnel only. The service uses role-based access controls (RBAC) to ensure that only individuals with the necessary clearance can access sensitive data. Additionally, multi-factor authentication (MFA) is employed for all accounts with administrative access.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">5.3 Incident Response and Data Breach Procedures</h3>
              <p className="text-gray-700 mb-6">
                In the event of a data breach or security incident, the service has an established incident response plan to quickly detect, contain, and mitigate the impact. If required, the service will notify the relevant supervisory authorities within 72 hours of becoming aware of a breach.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. AI-Specific Data Considerations</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">6.1 How AI Processes User Data</h3>
              <p className="text-gray-700 mb-4">
                The AI-powered chatbot processes User data to generate responses and improve service quality. This processing may involve Natural Language Processing (NLP), context retention, and service optimization while ensuring compliance with data protection laws.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.2 AI Training and Anonymization Practices</h3>
              <p className="text-gray-700 mb-4">
                Where possible, data used for AI training is anonymized to prevent the identification of individual Users. AI model improvements are based on aggregated patterns and trends rather than individual conversations. The User may request that their interactions are not used for AI training by contacting the service provider.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.3 Limitation of Automated Decision-Making</h3>
              <p className="text-gray-700 mb-6">
                The service does not use AI for fully automated decision-making that produces legal effects or significantly impacts the User without human intervention. If automated decision-making is used in any capacity, the User will be informed and will have the right to request human review of decisions that affect them.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Contact Information</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">7.1 How to File a Complaint</h3>
              <p className="text-gray-700 mb-4">
                The User has the right to file a complaint if they believe their personal data has been mishandled or if the service provider has not complied with GDPR regulations. Complaints can be submitted via:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-700"><strong>Email:</strong> contact@customate.ai</p>
                <p className="text-gray-700"><strong>Address:</strong> August-Bebel-Str. 89 - Haus 7, 14482 Potsdam, Germany</p>
              </div>

              <h3 className="text-xl font-medium text-gray-800 mb-3">7.2 Supervisory Authority</h3>
              <p className="text-gray-700 mb-4">
                If the User is not satisfied with the resolution of their complaint, they have the right to contact the German Data Protection Authority (BfDI):
              </p>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-gray-700"><strong>Website:</strong> https://www.bfdi.bund.de</p>
                <p className="text-gray-700"><strong>Phone:</strong> +49 (0)228 997799-0</p>
                <p className="text-gray-700"><strong>Address:</strong> Der Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI), Graurheindorfer Str. 153, 53117 Bonn, Germany</p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPage;