import React from 'react';

const Footer = () => {
  // Mock i18n language - replace with your actual i18n setup
  const currentLanguage = 'en';
  const currentYear = new Date().getFullYear();

  // All translations in one object - UPDATED WITH NORWEGIAN
  const translations = {
    en: {
      description: "Automate Customer Support.",
      product: "Product",
      company: "Company",
      features: "Features",
      pricing: "Pricing",
      blog: "Blog",
      contact: "Contact",
      aboutUs: "About Us",
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      cookies: "Cookie Policy",
      rights: `© ${currentYear} Customated S&A UG. All rights reserved.`,
      systemStatus: "System Online",
      madeIn: "Made in Germany 🇩🇪"
    },
    es: {
      description: "Chatbots impulsados por IA para empresas. Construye soporte al cliente inteligente con comportamientos específicos de la industria y bases de conocimiento personalizadas.",
      product: "Producto",
      company: "Empresa",
      features: "Características",
      pricing: "Precios",
      blog: "Blog",
      contact: "Contacto",
      aboutUs: "Acerca de Nosotros",
      terms: "Términos de Servicio",
      privacy: "Política de Privacidad",
      cookies: "Política de Cookies",
      rights: `© ${currentYear} Customated S&A UG. Todos los derechos reservados.`,
      systemStatus: "Sistema En Línea",
      madeIn: "Hecho en Alemania 🇩🇪"
    },
    de: {
      description: "KI-gestützte Chatbots für Unternehmen. Erstellen Sie intelligenten Kundensupport mit branchenspezifischen Verhaltensweisen und benutzerdefinierten Wissensbasen.",
      product: "Produkt",
      company: "Unternehmen",
      features: "Funktionen",
      pricing: "Preise",
      blog: "Blog",
      contact: "Kontakt",
      aboutUs: "Über Uns",
      terms: "Nutzungsbedingungen",
      privacy: "Datenschutzrichtlinie",
      cookies: "Cookie-Richtlinie",
      rights: `© ${currentYear} Customated S&A UG. Alle Rechte vorbehalten.`,
      systemStatus: "System Online",
      madeIn: "Hergestellt in Deutschland 🇩🇪"
    },
    fr: {
      description: "Chatbots alimentés par l'IA pour les entreprises. Créez un support client intelligent avec des comportements spécifiques à l'industrie et des bases de connaissances personnalisées.",
      product: "Produit",
      company: "Entreprise",
      features: "Fonctionnalités",
      pricing: "Tarifs",
      blog: "Blog",
      contact: "Contact",
      aboutUs: "À Propos de Nous",
      terms: "Conditions d'Utilisation",
      privacy: "Politique de Confidentialité",
      cookies: "Politique des Cookies",
      rights: `© ${currentYear} Customated S&A UG. Tous droits réservés.`,
      systemStatus: "Système En Ligne",
      madeIn: "Fabriqué en Allemagne 🇩🇪"
    },
    zh: {
      description: "为企业提供AI驱动的聊天机器人。构建具有行业特定行为和自定义知识库的智能客户支持。",
      product: "产品",
      company: "公司",
      features: "功能",
      pricing: "价格",
      blog: "博客",
      contact: "联系我们",
      aboutUs: "关于我们",
      terms: "服务条款",
      privacy: "隐私政策",
      cookies: "Cookie政策",
      rights: `© ${currentYear} Customated S&A UG. 保留所有权利。`,
      systemStatus: "系统在线",
      madeIn: "德国制造 🇩🇪"
    },
    // NEW: Norwegian translations
    no: {
      description: "AI-drevne chatboter for bedrifter. Bygg intelligent kundestøtte med bransjespesifikk oppførsel og tilpassede kunnskapsbaser.",
      product: "Produkt",
      company: "Selskap",
      features: "Funksjoner",
      pricing: "Priser",
      blog: "Blogg",
      contact: "Kontakt",
      aboutUs: "Om Oss",
      terms: "Vilkår for Bruk",
      privacy: "Personvernpolicy",
      cookies: "Informasjonskapsel-policy",
      rights: `© ${currentYear} Customated S&A UG. Alle rettigheter forbeholdt.`,
      systemStatus: "System Pålogget",
      madeIn: "Laget i Tyskland 🇩🇪"
    }
  };

  // Get current language, fallback to English
  const currentLang = translations[currentLanguage] || translations.en;

  // Function to handle smooth scrolling to sections
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.offsetTop;
      const offsetPosition = elementPosition - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Function to handle navigation clicks
  const handleNavClick = (href, e) => {
    if (href.startsWith('/#')) {
      e.preventDefault();
      const sectionId = href.replace('/#', '');
      
      // Check if we're on the homepage
      if (window.location.pathname !== '/') {
        window.location.href = href;
      } else {
        scrollToSection(sectionId);
      }
    }
  };

  return (
    <footer className="bg-gradient-to-br from-gray-50 via-white to-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-16">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-6">
              {/* Header Logo */}
              <div className="relative mr-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/>
                    <circle cx="17" cy="6" r="1"/>
                    <circle cx="19" cy="4" r="0.5"/>
                    <circle cx="21" cy="6" r="0.5"/>
                    <path d="M15 7l1-1 1 1-1 1z"/>
                  </svg>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl opacity-20 blur-sm"></div>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Customate.ai
              </h3>
            </div>
            
            <p className="text-gray-600 text-base leading-relaxed font-medium">
              {currentLang.description}
            </p>
          </div>
          
          {/* Navigation Links - Two Clean Columns */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-12">
            
            {/* Product & Resources */}
            <div>
              <h4 className="font-bold text-orange-600 mb-6 text-lg">
                {currentLang.product}
              </h4>
              <ul className="space-y-4">
                <li>
                  <button
                    onClick={(e) => handleNavClick('/#features', e)}
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1"
                  >
                    {currentLang.features}
                  </button>
                </li>
                <li>
                  <a
                    href="/pricing"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {currentLang.pricing}
                  </a>
                </li>
                <li>
                  <a
                    href="/blog"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {currentLang.blog}
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {currentLang.contact}
                  </a>
                </li>
              </ul>
            </div>

            {/* Company & Legal */}
            <div>
              <h4 className="font-bold text-orange-600 mb-6 text-lg">
                {currentLang.company}
              </h4>
              <ul className="space-y-4">
                <li>
                  <a
                    href="/about"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {currentLang.aboutUs}
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {currentLang.terms}
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {currentLang.privacy}
                  </a>
                </li>
                <li>
                  <a
                    href="/cookies"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {currentLang.cookies}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-200 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-600 font-medium">
              {currentLang.rights}
            </p>
            
            <div className="flex items-center space-x-8 text-gray-600">
              <span className="flex items-center font-medium">
                <span className="relative mr-3">
                  <span className="w-2 h-2 bg-green-500 rounded-full block"></span>
                  <span className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                </span>
                {currentLang.systemStatus}
              </span>
              <span className="font-medium">{currentLang.madeIn}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;