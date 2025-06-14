import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// Data Source Icons
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
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
};

// Chat Platform Icons
const ChatIcons = {
  WhatsApp: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.570-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.085"/>
    </svg>
  ),
  Facebook: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  Instagram: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  Twitter: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
};

// Integration Data
const integrations = {
  knowledge: {
    id: "knowledge",
    name: "Knowledge Base",
    description: "Your AI learns from your docs, FAQs & website content",
    icon: "KnowledgeBase",
    color: "#8B5CF6",
    features: [
      "Documents upload",
      "website crawling", 
      "Contextual understanding",
      "Custom Q&A ",
    ]
  }
};

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => (
  <div className="flex items-start p-3 rounded-lg hover:bg-white/5 transition-all">
    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mr-3">
      {icon}
    </div>
    <div>
      <h4 className="text-white font-medium text-sm">{title}</h4>
      <p className="text-gray-400 text-xs mt-1">{description}</p>
    </div>
  </div>
);

// Enhanced IntegrationsVisual component
const IntegrationsVisual = ({ type }) => {
  const integrationTools = {
    knowledge: [
      { name: "Document Import", icon: "📄", desc: "Upload PDFs, docs, and manuals" },
      { name: "Web Crawler", icon: "🌐", desc: "Extract data from your website" },
      { name: "FAQ Builder", icon: "❓", desc: "Create custom Q&A pairs" },
      { name: "Knowledge Editor", icon: "✏️", desc: "Fine-tune AI responses" }
    ]
  };
  
  const tools = integrationTools[type] || integrationTools.knowledge;

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 h-full">
      <div className="flex items-center mb-8">
        <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 mr-4">
          <DataSourceIcons.KnowledgeBase className="w-8 h-8 text-orange-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-xl">AI Knowledge Base</h3>
          <p className="text-gray-400 text-sm">Intelligent content management system</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        {tools.map((tool, index) => (
          <div key={index} className="bg-white/10 rounded-xl p-5 border border-white/10 hover:border-orange-500/30 hover:bg-white/15 transition-all group">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mr-3 group-hover:from-orange-500/30 group-hover:to-amber-500/30 transition-all">
                <span className="text-xl">{tool.icon}</span>
              </div>
              <h4 className="text-white text-sm font-semibold">{tool.name}</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{tool.desc}</p>
          </div>
        ))}
      </div>
      
      {/* Enhanced Visual representation */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 h-40 overflow-hidden border border-white/10">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full opacity-20 animate-pulse"></div>
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <p className="text-white text-lg font-semibold mb-1">Unified Knowledge</p>
            <p className="text-gray-400 text-sm">Instantly accessible to your AI</p>
            <div className="flex items-center justify-center mt-3 space-x-2">
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
        
        <div className="mb-4">
          <div className="bg-[#202c33] max-w-xs p-3 rounded-lg rounded-bl-none">
            <p className="text-white text-sm">{message.question}</p>
            <div className="flex justify-end mt-1">
              <span className="text-gray-400 text-xs">10:30 AM</span>
              <svg className="w-4 h-4 text-blue-400 ml-1" viewBox="0 0 16 15" fill="currentColor">
                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l2.541 2.434c.143.14.361.125.484-.033L10.91 3.879a.366.366 0 0 0-.063-.512z"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="bg-[#005c4b] max-w-xs ml-auto p-3 rounded-lg rounded-br-none">
            <p className="text-white text-sm">{message.answer}</p>
            <div className="flex justify-end mt-1">
              <span className="text-gray-300 text-xs">10:31 AM</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Input Area */}
      <div className="p-3 bg-[#202c33] flex items-center">
        <div className="flex-grow bg-[#2a3942] rounded-full px-4 py-2 flex items-center">
          <svg className="w-5 h-5 text-gray-400 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1"/>
            <path d="M12 1v6M12 17v6M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h6M17 12h6M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          <span className="text-gray-400 text-sm flex-grow">Type a message</span>
          <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <button className="ml-3 w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

const FacebookChat = ({ message }) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-xl h-full flex flex-col">
      {/* Chat Header */}
      <div className="bg-[#4267B2] p-3 flex items-center">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3">
          <span className="text-sm font-bold text-[#4267B2]">C</span>
        </div>
        <div className="flex-grow">
          <h3 className="text-white font-medium">Customate AI</h3>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
            <p className="text-xs text-blue-100">Active now</p>
          </div>
        </div>
      </div>
      
      {/* Message Area */}
      <div className="p-4 bg-gray-50 flex-grow overflow-y-auto">
        <div className="mb-4">
          <div className="bg-gray-200 max-w-xs p-3 rounded-2xl rounded-tl-md">
            <p className="text-gray-800 text-sm">{message.question}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">2:30 PM</p>
        </div>
        
        <div className="mb-4">
          <div className="bg-[#4267B2] max-w-xs ml-auto p-3 rounded-2xl rounded-tr-md">
            <p className="text-white text-sm">{message.answer}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">2:31 PM</p>
        </div>
      </div>
      
      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-200 flex items-center">
        <div className="flex-grow bg-gray-100 rounded-full px-4 py-2">
          <span className="text-gray-500 text-sm">Type a message...</span>
        </div>
        <button className="ml-3 w-8 h-8 bg-[#4267B2] rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

const InstagramChat = ({ message }) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-xl h-full flex flex-col">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-3 flex items-center">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3">
          <span className="text-sm font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">C</span>
        </div>
        <div className="flex-grow">
          <h3 className="text-white font-medium">customateai</h3>
          <p className="text-xs text-purple-100">Active now</p>
        </div>
      </div>
      
      {/* Message Area */}
      <div className="p-4 bg-gray-50 flex-grow overflow-y-auto">
        <div className="mb-4">
          <div className="bg-gray-200 max-w-xs p-3 rounded-2xl rounded-tl-md">
            <p className="text-gray-800 text-sm">{message.question}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">2:30 PM</p>
        </div>
        
        <div className="mb-4">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 max-w-xs ml-auto p-3 rounded-2xl rounded-tr-md">
            <p className="text-white text-sm">{message.answer}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">2:31 PM</p>
        </div>
      </div>
      
      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-200 flex items-center">
        <div className="flex-grow bg-gray-100 rounded-full px-4 py-2">
          <span className="text-gray-500 text-sm">Message...</span>
        </div>
        <button className="ml-3 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

const TwitterChat = ({ message }) => {
  return (
    <div className="bg-black rounded-xl overflow-hidden shadow-xl h-full flex flex-col">
      {/* Chat Header */}
      <div className="bg-black p-3 flex items-center border-b border-gray-800">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3">
          <span className="text-sm font-bold text-black">C</span>
        </div>
        <div className="flex-grow">
          <h3 className="text-white font-medium">@CustomateAI</h3>
          <p className="text-xs text-gray-400">Active now</p>
        </div>
      </div>
      
      {/* Message Area */}
      <div className="p-4 bg-black flex-grow overflow-y-auto">
        <div className="mb-4">
          <div className="bg-gray-800 max-w-xs p-3 rounded-2xl rounded-tl-md">
            <p className="text-white text-sm">{message.question}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">2:30 PM</p>
        </div>
        
        <div className="mb-4">
          <div className="bg-blue-600 max-w-xs ml-auto p-3 rounded-2xl rounded-tr-md">
            <p className="text-white text-sm">{message.answer}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">2:31 PM</p>
        </div>
      </div>
      
      {/* Input Area */}
      <div className="p-3 bg-black border-t border-gray-800 flex items-center">
        <div className="flex-grow bg-gray-900 rounded-full px-4 py-2">
          <span className="text-gray-500 text-sm">Start a message</span>
        </div>
        <button className="ml-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

// Main component with enhanced UI
const IntegrationsSection = () => {
  const { t } = useTranslation('integrations');
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
      color: "#E4405F",
      message: {
        question: "What are your store hours?",
        answer: "We're open Monday-Friday 9AM-8PM EST, and weekends 10AM-6PM EST. But I'm here 24/7 to help with any questions you have!"
      }
    },
    twitter: {
      id: "twitter",
      name: "X / Twitter",
      icon: "Twitter",
      color: "#1DA1F2",
      message: {
        question: "Can I return an item after 30 days?",
        answer: "Our standard return policy is 30 days, but we can make exceptions for special circumstances. Let me connect you with our customer service team to discuss your specific situation."
      }
    }
  };

  // Render channel interface with proper message
  const renderChannelInterface = () => {
    const currentChannel = channels[activeChannel];
    const message = currentChannel.message;

    switch (activeChannel) {
      case "whatsapp":
        return <WhatsAppChat message={message} />;
      case "facebook":
        return <FacebookChat message={message} />;
      case "instagram":
        return <InstagramChat message={message} />;
      case "twitter":
        return <TwitterChat message={message} />;
      default:
        return <WhatsAppChat message={message} />;
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-blue-900/95 to-purple-900/95"></div>
      <div className="absolute inset-0">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30">
              <span className="text-orange-400 text-sm font-medium">{t('badge', { defaultValue: 'Seamless Connectivity' })}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              {t('title.part1', { defaultValue: 'One AI,' })} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">{t('title.part2', { defaultValue: 'Everywhere' })}</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {t('subtitle', { defaultValue: 'Connect your business data and reach customers on every platform with consistent, intelligent AI interactions.' })}
            </p>
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-md mx-auto mb-12">
          <div className="inline-flex bg-white/5 backdrop-blur-sm p-1.5 rounded-full border border-white/10 shadow-inner">
            <button
              onClick={() => setActiveTab("data")}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === "data"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {t('tabs.dataSources', { defaultValue: 'Data Sources' })}
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === "chat"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {t('tabs.chatPlatforms', { defaultValue: 'Chat Platforms' })}
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
              {/* Enhanced Data Sources Tab Layout */}
              <div className="flex flex-col lg:flex-row gap-12 items-center">
                {/* Enhanced Left Column - Knowledge Base Card */}
                <div className="lg:w-1/2 w-full">
                  <h3 className="text-3xl font-bold text-white mb-8 text-center lg:text-left">
                    {t('dataSources.title.part1', { defaultValue: 'Smart' })} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">{t('dataSources.title.part2', { defaultValue: 'Data Sources' })}</span>
                  </h3>
                  
                  {/* Single Enhanced Knowledge Base Card */}
                  <motion.div
                    className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-8 shadow-2xl shadow-orange-500/10"
                    whileHover={{ 
                      y: -8, 
                      scale: 1.02,
                      boxShadow: "0 25px 50px -12px rgba(249, 115, 22, 0.25)",
                      transition: { duration: 0.3 } 
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mr-5 border border-orange-500/30">
                        <DataSourceIcons.KnowledgeBase className="w-8 h-8 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-2xl">Knowledge Base</h3>
                        <p className="text-gray-300 text-sm">AI-powered content intelligence</p>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p className="text-gray-300 text-base mb-6 leading-relaxed">
                      Your AI learns from your docs, FAQs & website content to provide accurate, contextual responses to every customer query.
                    </p>
                    
                    {/* Features List */}
                    <div className="space-y-3 mb-6">
                      {integrations.knowledge.features.map((feature, index) => (
                        <div key={index} className="flex items-center text-gray-300">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 mr-3 flex-shrink-0"></div>
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                  </motion.div>
                </div>
                
                {/* Right Column - Enhanced Visualization */}
                <div className="lg:w-1/2 w-full">
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
              <h2 className="text-3xl font-bold text-white mb-8 text-center">{t('chatPlatforms.title.part1', { defaultValue: 'Multi-Platform' })} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">{t('chatPlatforms.title.part2', { defaultValue: 'Messaging' })}</span></h2>
              
              {/* Platform Selection */}
              <div className="max-w-md mx-auto bg-white/5 backdrop-blur-sm rounded-2xl p-1.5 border border-white/10 shadow-xl mb-8">
                <div className="flex justify-center items-center">
                  {Object.values(channels).map((channel) => {
                    const IconComponent = ChatIcons[channel.icon];
                    return (
                      <button
                        key={channel.id}
                        onClick={() => setActiveChannel(channel.id)}
                        className={`flex flex-col items-center justify-center py-2 px-3 mx-1 rounded-xl transition-all ${
                          activeChannel === channel.id 
                          ? 'bg-gradient-to-br from-orange-500/90 to-amber-500/90 shadow-lg shadow-orange-500/20 transform scale-105' 
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
                {/* Left Column - Chat Interface */}
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
                
                {/* Right Column - Features */}
                <div>
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl h-full">
                    <div className="flex items-center mb-8">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mr-4">
                        <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{t('chatPlatforms.features.omnichannelPresence.title', { defaultValue: 'Omnichannel Presence' })}</h3>
                        <p className="text-gray-400">{t('chatPlatforms.features.omnichannelPresence.description', { defaultValue: 'One AI, any communication platform' })}</p>
                      </div>
                    </div>
                    
                    {/* Features */}
                    <div className="space-y-4 mb-6">
                      <FeatureCard 
                        icon={
                          <svg className="w-6 h-6 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        }
                        title={t('chatPlatforms.features.nativeInterface.title', { defaultValue: 'Native Interface' })}
                        description={t('chatPlatforms.features.nativeInterface.description', { defaultValue: 'Looks and feels like the original platform' })}
                      />
                      
                      <FeatureCard 
                        icon={
                          <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21,15 16,10 5,21" />
                          </svg>
                        }
                        title={t('chatPlatforms.features.richMedia.title', { defaultValue: 'Rich Media' })}
                        description={t('chatPlatforms.features.richMedia.description', { defaultValue: 'Send images, buttons, cards, and more' })}
                      />
                      
                      <FeatureCard 
                        icon={
                          <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M19 8v8a2 2 0 01-2 2H6l3-3V9a2 2 0 012-2h8a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M17 13l-3 3 3 3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        }
                        title={t('chatPlatforms.features.realtimeTranslation.title', { defaultValue: 'Real-time Translation' })}
                        description={t('chatPlatforms.features.realtimeTranslation.description', { defaultValue: 'Communicate with customers in 100+ languages automatically' })}
                      />
                      
                      <FeatureCard 
                        icon={
                          <svg className="w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="12,6 12,12 16,14" />
                          </svg>
                        }
                        title={t('chatPlatforms.features.availability.title', { defaultValue: '24/7 Availability' })}
                        description={t('chatPlatforms.features.availability.description', { defaultValue: 'Always-on support for your customers' })}
                      />
                      
                      <FeatureCard 
                        icon={
                          <svg className="w-6 h-6 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        }
                        title={t('chatPlatforms.features.consistentVoice.title', { defaultValue: 'Consistent Voice' })}
                        description={t('chatPlatforms.features.consistentVoice.description', { defaultValue: 'Same brand experience everywhere' })}
                      />
                      
                      <FeatureCard 
                        icon={
                          <svg className="w-6 h-6 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        }
                        title={t('chatPlatforms.features.smartHandoff.title', { defaultValue: 'Smart Handoff' })}
                        description={t('chatPlatforms.features.smartHandoff.description', { defaultValue: 'Seamless transfer to human agents' })}
                      />
                    </div>
                    
                    {/* Deploy message */}
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <div className="flex items-center text-orange-400">
                        <svg className="w-5 h-5 mr-2" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-14v7l6 3-1-2-4-2V6h-1z"/>
                        </svg>
                        <span className="text-sm font-medium">{t('chatPlatforms.deployMessage', { defaultValue: 'Deploy to any platform in minutes with no coding' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default IntegrationsSection;