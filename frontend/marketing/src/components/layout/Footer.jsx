import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { i18n } = useTranslation();
  const location = useLocation();
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
      description: "Automatiza el Soporte al Cliente.",
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
      description: "Automatisieren Sie den Kundensupport.",
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
      description: "Automatisez le Support Client.",
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
      description: "自动化客户支持。",
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
      description: "Automatiser Kundestøtte.",
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
  const currentLang = translations[i18n.language] || translations.en;

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
      
      if (location.pathname !== '/') {
        window.location.href = href;
      } else {
        scrollToSection(sectionId);
      }
    }
  };

  return (
<footer className="bg-white border-t border-gray-100">
  <div className="max-w-7xl mx-auto px-6 py-12">
    
    {/* Main Footer Content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-8">
      
      {/* Company Info */}
      <div className="lg:col-span-1">
        <div className="flex items-center mb-6">
          {/* Footer Logo - No visible background */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3">
            <img 
              src="/assets/customate-logo.svg" 
              alt="Customate.ai Logo" 
              className="w-8 h-8 object-contain"
            />
          </div>
          {/* Replace text with your SVG */}
          <img 
            src="/assets/Logo0520252.svg" 
            alt="Customate.ai" 
            className="h-8 object-contain"
          />
        </div>
            
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              {currentLang.description}
            </p>
          </div>
          
          {/* Navigation Links - Two Clean Columns */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-8">
            
            {/* Product & Resources */}
            <div>
              <h4 className="font-semibold text-orange-500 mb-4">
                {currentLang.product}
              </h4>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={(e) => handleNavClick('/#features', e)}
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    {currentLang.features}
                  </button>
                </li>
                <li>
                  <Link
                    to="/pricing"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    {currentLang.pricing}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/blog"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    {currentLang.blog}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    {currentLang.contact}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company & Legal */}
            <div>
              <h4 className="font-semibold text-orange-500 mb-4">
                {currentLang.company}
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/about"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    {currentLang.aboutUs}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    {currentLang.terms}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    {currentLang.privacy}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cookies"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    {currentLang.cookies}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;