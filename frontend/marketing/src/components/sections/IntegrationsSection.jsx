import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// SVG components for social media integrations
const ChatIcons = {
  WhatsApp: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.93 14.31c-.34.97-.99 1.76-1.91 2.23-.77.4-1.69.54-2.59.47-1.09-.09-2.16-.44-3.11-.99l-2.83.74.76-2.8c-.58-.98-.95-2.1-1.05-3.27-.1-1.19.12-2.37.63-3.39.51-1.02 1.3-1.84 2.28-2.33 1.89-.95 4.09-.63 5.64.76 1.55 1.38 2.21 3.53 1.72 5.58h-.01c.19.17.35.35.47.55z"/>
      <path fill="currentColor" d="M16.63 14.5c-.1-.18-.38-.29-.79-.5-.41-.21-2.44-1.2-2.82-1.34-.38-.14-.65-.21-.92.21-.28.42-1.09 1.33-1.34 1.61-.25.28-.49.32-.9.1-.42-.21-1.75-.65-3.34-2.05-1.23-1.1-2.07-2.45-2.31-2.87-.24-.42-.03-.64.18-.85.19-.19.42-.49.63-.74.21-.25.28-.42.42-.7.14-.28.07-.52-.03-.74-.1-.21-.93-2.23-1.27-3.05-.33-.8-.67-.69-.92-.7-.24-.01-.5-.01-.77-.01-.28 0-.7.1-1.06.52-.35.42-1.34 1.32-1.34 3.23 0 1.91 1.4 3.74 1.58 4.01.18.27 2.57 4.14 6.33 5.62 3.76 1.48 3.76.99 4.45.93.69-.07 2.23-.91 2.54-1.8.31-.89.31-1.64.21-1.81z"/>
    </svg>
  ),
  Facebook: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path fill="currentColor" d="M20.9 2H3.1A1.1 1.1 0 002 3.1v17.8A1.1 1.1 0 003.1 22h9.58v-7.75h-2.6v-3h2.6V9a3.64 3.64 0 013.88-4 20.26 20.26 0 012.33.12v2.7H17.3c-1.26 0-1.5.6-1.5 1.47v1.93h3l-.39 3H15.8V22h5.1a1.1 1.1 0 001.1-1.1V3.1A1.1 1.1 0 0020.9 2z"/>
    </svg>
  ),
  Instagram: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path fill="currentColor" d="M12 2c-2.716 0-3.056.012-4.123.06-1.064.049-1.791.218-2.427.465a4.902 4.902 0 00-1.772 1.153A4.902 4.902 0 002.525 5.45c-.247.636-.416 1.363-.465 2.427C2.012 8.944 2 9.284 2 12s.012 3.056.06 4.123c.049 1.064.218 1.791.465 2.427a4.902 4.902 0 001.153 1.772 4.902 4.902 0 001.772 1.153c.636.247 1.363.416 2.427.465 1.067.048 1.407.06 4.123.06s3.056-.012 4.123-.06c1.064-.049 1.791-.218 2.427-.465a4.902 4.902 0 001.772-1.153 4.902 4.902 0 001.153-1.772c.247-.636.416-1.363.465-2.427.048-1.067.06-1.407.06-4.123s-.012-3.056-.06-4.123c-.049-1.064-.218-1.791-.465-2.427a4.902 4.902 0 00-1.153-1.772A4.902 4.902 0 0018.55 2.525c-.636-.247-1.363-.416-2.427-.465C15.056 2.012 14.716 2 12 2zm0 1.802c2.67 0 2.986.01 4.04.058.976.045 1.505.207 1.858.344.466.181.8.399 1.15.748.35.35.566.684.748 1.15.136.353.3.882.344 1.857.048 1.055.058 1.37.058 4.041 0 2.67-.01 2.986-.058 4.04-.045.976-.208 1.505-.344 1.858a3.1 3.1 0 01-.748 1.15c-.35.35-.684.566-1.15.748-.353.136-.882.3-1.857.344-1.054.048-1.37.058-4.041.058-2.67 0-2.987-.01-4.04-.058-.976-.045-1.505-.208-1.858-.344a3.098 3.098 0 01-1.15-.748 3.098 3.098 0 01-.748-1.15c-.137-.353-.3-.882-.344-1.857-.048-1.055-.058-1.37-.058-4.041 0-2.67.01-2.986.058-4.04.045-.976.207-1.505.344-1.858.181-.466.399-.8.748-1.15.35-.35.684-.567 1.15-.748.353-.137.882-.3 1.857-.344 1.055-.048 1.37-.058 4.041-.058z"/>
      <path fill="currentColor" d="M12 15.333a3.333 3.333 0 110-6.666 3.333 3.333 0 010 6.666zm0-8.466a5.133 5.133 0 100 10.266 5.133 5.133 0 000-10.266zm6.538.168a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z"/>
    </svg>
  ),
  Twitter: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path fill="currentColor" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
    </svg>
  )
};

// Data source icons with improved visuals
const DataSourceIcons = {
  KnowledgeBase: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      className={props.className || "w-6 h-6"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <path d="M8 7h6" />
      <path d="M8 11h8" />
      <path d="M8 15h6" />
    </svg>
  ),
  CRM: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      className={props.className || "w-6 h-6"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  ERP: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      className={props.className || "w-6 h-6"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 9a3 3 0 0 1 0-6h12a3 3 0 0 1 0 6h-3" />
      <path d="M14 15a3 3 0 1 0 0-6H2" />
      <path d="M2 15a3 3 0 1 0 0 6h12a3 3 0 1 0 0-6H2" />
      <path d="M14 21h8" />
      <path d="M18 17v8" />
    </svg>
  ),
  HelpDesk: (props) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      className={props.className || "w-6 h-6"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
};

// Message Interface Components
const WhatsAppChat = ({ message }) => {
  return (
    <div className="bg-[#111b21] rounded-xl overflow-hidden shadow-xl h-full flex flex-col">
      {/* Chat Header */}
      <div className="bg-[#202c33] p-3 flex items-center">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center mr-3">
          <span className="text-sm font-bold text-white">C</span>
        </div>
        <div className="flex-grow">
          <h3 className="text-white font-medium">Customate AI</h3>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            <p className="text-xs text-gray-400">online</p>
          </div>
        </div>
        <div className="flex space-x-3 text-gray-400">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      
      {/* Message Area */}
      <div className="p-4 bg-[#0b141a] bg-opacity-90 flex-grow overflow-y-auto">
        <div className="mb-3 opacity-50 text-gray-400 text-xs text-center">TODAY</div>
        
        <div className="flex justify-end mb-4">
          <div className="max-w-[80%] bg-[#005c4b] p-3 rounded-lg rounded-tr-none text-white text-sm">
            <p>{message.question}</p>
            <div className="text-right mt-1">
              <span className="text-[10px] text-gray-300">10:30 AM</span>
              <svg className="w-4 h-4 inline-block ml-1 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex justify-start mb-4">
          <div className="max-w-[80%] bg-[#202c33] p-3 rounded-lg rounded-tl-none text-white text-sm">
            <p>{message.answer}</p>
            <div className="text-right mt-1">
              <span className="text-[10px] text-gray-400">10:31 AM</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Message Input */}
      <div className="bg-[#202c33] p-2 flex items-center space-x-2">
        <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-4-9h8a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2zm0 4h4a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2z"/>
        </svg>
        <div className="flex-grow bg-[#2a3942] rounded-full px-4 py-2 text-gray-400 text-sm">
          Type a message
        </div>
        <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

const FacebookChat = ({ message }) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-xl h-full flex flex-col">
      {/* Messenger Header */}
      <div className="bg-[#0084ff] p-3 flex items-center">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3">
          <span className="text-sm font-bold text-[#0084ff]">C</span>
        </div>
        <div className="flex-grow">
          <h3 className="text-white font-medium">Customate AI</h3>
          <p className="text-xs text-blue-100">Active now</p>
        </div>
        <div className="flex space-x-3 text-white">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      
      {/* Message Area */}
      <div className="p-4 h-full bg-[#f0f0f0] flex flex-col">
        <div className="flex justify-end mb-4">
          <div className="max-w-[80%] bg-[#0084ff] p-3 rounded-3xl text-white text-sm">
            <p>{message.question}</p>
          </div>
        </div>
        
        <div className="flex mb-4">
          <div className="w-8 h-8 rounded-full bg-[#0084ff] flex items-center justify-center mr-2 flex-shrink-0">
            <span className="text-xs font-bold text-white">C</span>
          </div>
          <div className="max-w-[80%] bg-gray-200 p-3 rounded-3xl text-gray-800 text-sm">
            <p>{message.answer}</p>
          </div>
        </div>
      </div>
      
      {/* Message Input */}
      <div className="bg-white border-t p-3 flex items-center space-x-2">
        <div className="flex-grow rounded-full px-4 py-2 text-gray-400 text-sm bg-gray-100">
          Aa
        </div>
        <svg className="w-6 h-6 text-[#0084ff]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </div>
    </div>
  );
};

const InstagramChat = ({ message }) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-xl h-full flex flex-col">
      {/* Instagram Header */}
      <div className="bg-white p-3 border-b flex items-center">
        <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 flex items-center justify-center mr-2 flex-shrink-0">
          <span className="text-xs font-bold text-white">C</span>
        </div>
        <div className="flex-grow">
          <h3 className="font-semibold">customate.ai</h3>
        </div>
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 8l8 8 8-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      
      {/* Message Area */}
      <div className="p-4 h-full bg-white flex flex-col">
        <div className="text-center text-gray-400 text-xs mb-4">Yesterday</div>
        
        <div className="flex justify-end mb-4">
          <div className="max-w-[80%] bg-gray-100 p-3 rounded-3xl text-gray-800 text-sm">
            <p>{message.question}</p>
          </div>
        </div>
        
        <div className="flex mb-4">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
            <span className="text-[8px] font-bold text-white">C</span>
          </div>
          <div className="max-w-[80%] bg-white border p-3 rounded-3xl text-gray-800 text-sm">
            <p>{message.answer}</p>
          </div>
        </div>
      </div>
      
      {/* Message Input */}
      <div className="bg-white border-t p-3 flex items-center space-x-2">
        <div className="flex-grow rounded-full px-4 py-2 text-gray-400 text-sm border">
          Message...
        </div>
        <span className="text-blue-500 font-semibold text-sm">Send</span>
      </div>
    </div>
  );
};

const TwitterChat = ({ message }) => {
  return (
    <div className="bg-black rounded-xl overflow-hidden shadow-xl h-full flex flex-col">
      {/* Twitter DM Header */}
      <div className="bg-black p-3 border-b border-gray-800 flex items-center">
        <svg className="w-6 h-6 mr-3 text-[#1d9bf0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="w-10 h-10 rounded-full bg-[#1d9bf0] flex items-center justify-center mr-3 flex-shrink-0">
          <span className="text-sm font-bold text-white">C</span>
        </div>
        <div className="flex-grow">
          <h3 className="text-white font-bold">Customate AI</h3>
          <p className="text-gray-500 text-xs">@customate_ai</p>
        </div>
      </div>
      
      {/* Message Area */}
      <div className="p-4 h-full bg-black flex flex-col">
        <div className="flex justify-end mb-4">
          <div className="max-w-[80%] bg-[#1d9bf0] p-3 rounded-3xl text-white text-sm">
            <p>{message.question}</p>
          </div>
        </div>
        
        <div className="flex mb-4">
          <div className="w-8 h-8 rounded-full bg-[#1d9bf0] flex items-center justify-center mr-2 flex-shrink-0">
            <span className="text-xs font-bold text-white">C</span>
          </div>
          <div className="max-w-[80%] bg-gray-800 p-3 rounded-3xl text-white text-sm">
            <p>{message.answer}</p>
          </div>
        </div>
      </div>
      
      {/* Message Input */}
      <div className="bg-black border-t border-gray-800 p-3 flex items-center space-x-2">
        <div className="flex-grow rounded-full px-4 py-2 text-gray-400 text-sm bg-gray-800">
          Start a message
        </div>
        <div className="w-8 h-8 rounded-full bg-[#1d9bf0] flex items-center justify-center text-white">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

// Feature Card Components from second file
const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-orange-500/30 transition-all shadow-lg transform hover:-translate-y-1 duration-300">
    <div className="flex items-center">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mr-4 shadow-inner shadow-orange-500/10">
        {icon}
      </div>
      <div>
        <h4 className="text-white font-medium">{title}</h4>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </div>
  </div>
);

const MiniFeatureCard = ({ icon, title, description }) => (
  <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10 transition-all shadow-lg">
    <div className="flex items-center">
      {icon}
      <h4 className="text-white font-medium text-sm">{title}</h4>
    </div>
    <p className="text-gray-400 text-xs mt-1">{description}</p>
  </div>
);

// Modified IntegrationsVisual component - removed animated dots
const IntegrationsVisual = ({ type }) => {
  // Specific integration tools for each category
  const integrationTools = {
    knowledge: [
      { name: "Document Import", icon: "📄", desc: "Upload PDFs, docs, and manuals" },
      { name: "Web Crawler", icon: "🌐", desc: "Extract data from your website" },
      { name: "FAQ Builder", icon: "❓", desc: "Create custom Q&A pairs" },
      { name: "Knowledge Editor", icon: "✏️", desc: "Fine-tune AI responses" }
    ],
    crm: [
      { name: "Salesforce", icon: "☁️", desc: "Full CRM integration" },
      { name: "Zendesk", icon: "🎯", desc: "Customer support data" },
      { name: "Shopify", icon: "🛒", desc: "E-commerce integration" },
      { name: "HubSpot", icon: "🔄", desc: "Marketing automation" }
    ],
    erp: [
      { name: "SAP", icon: "📊", desc: "Enterprise resource planning" },
      { name: "Oracle", icon: "🔮", desc: "Business intelligence" },
      { name: "Microsoft Dynamics", icon: "📱", desc: "Business applications" },
      { name: "NetSuite", icon: "☁️", desc: "Cloud ERP solution" }
    ],
    helpdesk: [
      { name: "Zendesk", icon: "🎯", desc: "Ticketing system" },
      { name: "Intercom", icon: "💬", desc: "Customer messaging" },
      { name: "Freshdesk", icon: "🥇", desc: "Customer engagement" },
      { name: "ServiceNow", icon: "⚙️", desc: "IT service management" }
    ]
  };

  const tools = integrationTools[type] || integrationTools.knowledge;

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-5 h-full">
      <div className="flex items-center mb-6">
        <div className="p-2 rounded-lg bg-orange-500/20 mr-3">
          {type === 'knowledge' && <DataSourceIcons.KnowledgeBase className="w-6 h-6 text-orange-400" />}
          {type === 'crm' && <DataSourceIcons.CRM className="w-6 h-6 text-blue-400" />}
          {type === 'erp' && <DataSourceIcons.ERP className="w-6 h-6 text-green-400" />}
          {type === 'helpdesk' && <DataSourceIcons.HelpDesk className="w-6 h-6 text-purple-400" />}
        </div>
        <h3 className="text-white font-semibold">
          {type === 'knowledge' && 'AI Knowledge Base'}
          {type === 'crm' && 'CRM Integration'}
          {type === 'erp' && 'ERP/Inventory System'}
          {type === 'helpdesk' && 'Help Desk Connection'}
        </h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        {tools.map((tool, index) => (
          <div key={index} className="bg-white/10 rounded-lg p-4 border border-white/10 hover:border-white/30 transition-all">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mr-3">
                <span className="text-lg">{tool.icon}</span>
              </div>
              <h4 className="text-white text-sm font-medium">{tool.name}</h4>
            </div>
            <p className="text-xs text-gray-400">{tool.desc}</p>
          </div>
        ))}
      </div>
      
      {/* Visual representation - removed animated dots */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-4 h-36 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full opacity-20 animate-pulse"></div>
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <p className="text-white text-sm font-medium">
              {type === 'knowledge' && 'Unified Knowledge'}
              {type === 'crm' && 'Customer Insights'}
              {type === 'erp' && 'Inventory Intelligence'}
              {type === 'helpdesk' && 'Support History'}
            </p>
            <p className="text-gray-400 text-xs">Instantly accessible to your AI</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component with changes
const IntegrationsSection = () => {
  const [activeTab, setActiveTab] = useState("data");
  const [activeChannel, setActiveChannel] = useState("whatsapp");
  const [activeIntegration, setActiveIntegration] = useState("knowledge");
  
  // Channel data definitions with updated messages
  const channels = {
    whatsapp: {
      id: "whatsapp",
      name: "WhatsApp",
      icon: "WhatsApp",
      color: "#25D366",
      message: {
        question: "How do I track my order?",
        answer: "You can track your order by clicking the 'Order Status' link in your confirmation email. If you need more help, send me your order number and I'll check for you instantly."
      }
    },
    facebook: {
      id: "facebook",
      name: "Facebook",
      icon: "Facebook",
      color: "#1877F2",
      message: {
        question: "Do you offer student discounts?",
        answer: "Yes! We offer a 15% student discount. Just verify your student status through our website and we'll apply the discount automatically to all your future orders."
      }
    },
    instagram: {
      id: "instagram",
      name: "Instagram",
      icon: "Instagram",
      color: "#E1306C",
      message: {
        question: "When will the new collection be available?",
        answer: "Our new summer collection will launch next Thursday at 9 AM EST. If you'd like, I can send you a reminder when it goes live and give you early access."
      }
    },
    twitter: {
      id: "twitter",
      name: "X / Twitter",
      icon: "Twitter",
      color: "#000000",
      message: {
        question: "Is your platform compatible with Shopify?",
        answer: "Yes! We have a native Shopify integration that takes just 5 minutes to set up. It will sync your products, inventory and orders automatically in real-time."
      }
    }
  };
  
  // Integration data with improved descriptions
  const integrations = {
    knowledge: {
      id: "knowledge",
      name: "Knowledge Base",
      icon: "KnowledgeBase",
      color: "#FF7E33",
      description: "Your AI learns from your docs, FAQs & website content"
    },
    crm: {
      id: "crm",
      name: "CRM Systems",
      icon: "CRM",
      color: "#2563EB",
      description: "Connect customer data from Salesforce, Zendesk & more"
    },
    erp: {
      id: "erp",
      name: "ERP/Inventory",
      icon: "ERP",
      color: "#16A34A",
      description: "Real-time product and stock information integration"
    },
    helpdesk: {
      id: "helpdesk",
      name: "Help Desk",
      icon: "HelpDesk",
      color: "#8B5CF6",
      description: "Link support tickets, chat history & customer issues"
    }
  };

  // Render the appropriate channel interface
  const renderChannelInterface = () => {
    const channelData = channels[activeChannel];
    if (!channelData) return null;
    
    switch (activeChannel) {
      case 'whatsapp':
        return <WhatsAppChat message={channelData.message} />;
      case 'facebook':
        return <FacebookChat message={channelData.message} />;
      case 'instagram':
        return <InstagramChat message={channelData.message} />;
      case 'twitter':
        return <TwitterChat message={channelData.message} />;
      default:
        return null;
    }
  };

  return (
    <section 
      id="integrations"
      className="relative py-24 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-40 -left-20 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      {/* Content Container */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-orange-400 mb-4">
              <span className="h-2 w-2 rounded-full bg-orange-500 mr-2"></span>
              <span className="text-sm font-medium uppercase tracking-wider">Seamless Connectivity</span>
            </span>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              One AI, <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-300">Everywhere</span>
            </h2>
            
            <p className="text-xl max-w-3xl mx-auto text-gray-300">
              Connect your business data and reach customers on every platform with consistent, intelligent AI interactions.
            </p>
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-md mx-auto mb-10">
          <div className="inline-flex bg-white/5 backdrop-blur-sm p-1.5 rounded-full border border-white/10 shadow-inner">
            <button
              onClick={() => setActiveTab("data")}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === "data"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Data Sources
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === "chat"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Chat Platforms
            </button>
          </div>
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {activeTab === "data" ? (
            <motion.div
              key="data-sources"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="max-w-6xl mx-auto"
            >
              {/* Data Sources Tab - Modified to remove animations and fix layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">
                    Smart <span className="text-orange-400">Data Sources</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {Object.values(integrations).map((integration) => {
                      const IconComponent = DataSourceIcons[integration.icon];
                      return (
                        <motion.div
                          key={integration.id}
                          onClick={() => setActiveIntegration(integration.id)}
                          className={`cursor-pointer p-4 rounded-xl transition-all ${
                            activeIntegration === integration.id 
                            ? 'bg-gradient-to-br from-white/10 to-white/5 border border-orange-500/50 shadow-lg shadow-orange-500/20' 
                            : 'bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/30'
                          }`}
                          whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        >
                          <div className="flex items-center mb-2">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3" 
                                style={{ backgroundColor: `${integration.color}30` }}>
                              {IconComponent && <IconComponent className="w-6 h-6" style={{ color: integration.color }} />}
                            </div>
                            <h3 className="font-semibold text-white">{integration.name}</h3>
                          </div>
                          <p className="text-sm text-gray-400">{integration.description}</p>
                          
                          {/* Removed the animated white dot indicator */}
                          {activeIntegration === integration.id && (
                            <div className="mt-2">
                              <div className="h-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full">
                                {/* Animation removed */}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <IntegrationsVisual type={activeIntegration} />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat-platforms"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="max-w-6xl mx-auto"
            >
              {/* Chat Platforms Tab */}
              <h2 className="text-2xl font-bold text-white mb-8">Multi-Platform <span className="text-orange-400">Messaging</span></h2>
              
{/* Platform Selection - Smaller and Centered */}
<div className="max-w-md mx-auto bg-white/5 backdrop-blur-sm rounded-2xl p-1.5 border border-white/10 shadow-xl mb-6">
  <div className="flex justify-center items-center">
    {Object.values(channels).map((channel) => {
      const IconComponent = ChatIcons[channel.icon];
      return (
        <button
          key={channel.id}
          onClick={() => setActiveChannel(channel.id)}
          className={`flex flex-col items-center justify-center py-1.5 px-2 mx-1 rounded-lg transition-all ${
            activeChannel === channel.id 
            ? 'bg-gradient-to-br from-orange-500/90 to-amber-500/90 shadow-lg shadow-orange-500/20' 
            : 'hover:bg-white/10'
          }`}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1" 
              style={{ 
                backgroundColor: activeChannel === channel.id ? 'rgba(255, 255, 255, 0.2)' : `${channel.color}20`,
                color: activeChannel === channel.id ? 'white' : channel.color 
              }}>
            {IconComponent && <IconComponent />}
          </div>
          <span className={`text-xs font-medium ${
            activeChannel === channel.id ? 'text-white' : 'text-gray-400'
          }`}>
            {channel.name}
          </span>
        </button>
      );
    })}
  </div>
</div>
              {/* Main Content - Chat Platforms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column - Features */}
                <div>
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl h-full">
                    <div className="flex items-center mb-8">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mr-4">
                        <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Omnichannel Presence</h3>
                        <p className="text-gray-400">One AI, any communication platform</p>
                      </div>
                    </div>
                    
                    {/* Main Features */}
                    <div className="space-y-4 mb-6">
                      <FeatureCard 
                        icon={
                          <svg className="w-6 h-6 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l4 4L3 21l4-4L13 3z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        }
                        title="Native Interface" 
                        description="Looks and feels like the original platform" 
                      />
                      
                      <FeatureCard 
                        icon={
                          <svg className="w-6 h-6 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        }
                        title="Rich Media" 
                        description="Send images, buttons, cards, and more" 
                      />
                      
                      <FeatureCard 
                        icon={
                          <svg className="w-6 h-6 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        }
                        title="24/7 Availability" 
                        description="Always-on support for your customers" 
                      />
                    </div>
                    
                    {/* Mini Features */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <MiniFeatureCard 
                        icon={
                          <svg className="w-5 h-5 text-orange-400 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        }
                        title="Consistent Voice" 
                        description="Same brand experience everywhere" 
                      />
                      
                      <MiniFeatureCard 
                        icon={
                          <svg className="w-5 h-5 text-orange-400 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        }
                        title="Smart Handoff" 
                        description="Seamless transfer to human agents" 
                      />
                    </div>
                    
                    <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 shadow-lg">
                      <div className="flex items-center text-white">
                        <svg className="w-5 h-5 text-orange-400 mr-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-14v7l6 3-1-2-4-2V6h-1z"/>
                        </svg>
                        <span className="text-sm font-medium">Deploy to any platform in minutes with no coding</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Chat Interface */}
                <div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeChannel}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-2xl h-[600px]"
                    >
                      {renderChannelInterface()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Call to Action */}
        <div className="mt-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="max-w-3xl mx-auto px-4"
          >
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
              Ready to elevate your customer experience?
            </h3>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Deploy AI across all your channels in minutes, not months. No coding required.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="#" className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium rounded-full shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:from-orange-600 hover:to-amber-600 transition-all">
                Start Free Trial
              </a>
              <a href="#" className="px-8 py-3 bg-white/10 backdrop-blur-sm text-white font-medium rounded-full border border-white/20 hover:bg-white/20 transition-all">
                Watch Demo
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;