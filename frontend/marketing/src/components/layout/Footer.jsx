import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Imprint Modal Component
const ImprintModal = ({ isOpen, onClose, currentLang }) => {
  const { i18n } = useTranslation(); // <-- Move this to the top

  if (!isOpen) return null;

  // Translated content for the imprint modal
  const imprintContent = {
    en: {
      title: "Imprint",
      companyInfo: "Unternehmensinformationen",
      legalName: "Customated S&A UG:",
      legalForm: "Unternehmergesellschaft (haftungsbeschränkt)",
      address: "August-Bebel-Str. 89 – Haus 7, 14482 Potsdam",
      phone: "+49 0 1781796007:",
      email: "admin (a±) customate.ai",
      website: "www.customate.ai",
      tradeRegister: "HRB 40697 P:",
      taxId: "046/107/05966",
      legalRep: "José Ignacio Orias Calvo",
      termsNotice: "The Terms and Conditions (T&C) of the service provider apply to all interactions with the website and its services. Users are encouraged to review the T&C for detailed information on rights, responsibilities, and limitations.",
      close: "Close"
    },
    de: {
      title: "Impressum",
      companyInfo: "Unternehmensinformationen",
      legalName: "Customated S&A UG:",
      legalForm: "Unternehmergesellschaft (haftungsbeschränkt)",
      address: "August-Bebel-Str. 89 – Haus 7, 14482 Potsdam",
      phone: "+49 0 1781796007:",
      email: "admin (a±) customate.ai",
      website: "www.customate.ai",
      tradeRegister: "HRB 40697 P:",
      taxId: "046/107/05966",
      legalRep: "José Ignacio Orias Calvo",
      termsNotice: `Es gelten die Allgemeinen Geschäftsbedingungen des Dienstanbieters für alle Interaktionen
                        mit der Website und deren Diensten. Nutzern wird empfohlen, die AGB sorgfältig zu lesen,
                        um sich über Rechte, Pflichten und Einschränkungen zu informieren.`,
      close: "Schließen"
    },
    es: {
      title: "Aviso Legal",
      companyInfo: "Unternehmensinformationen",
      legalName: "Customated S&A UG:",
      legalForm: "Unternehmergesellschaft (haftungsbeschränkt)",
      address: "August-Bebel-Str. 89 – Haus 7, 14482 Potsdam",
      phone: "+49 0 1781796007:",
      email: "admin (a±) customate.ai",
      website: "www.customate.ai",
      tradeRegister: "HRB 40697 P:",
      taxId: "046/107/05966",
      legalRep: "José Ignacio Orias Calvo",
      termsNotice: "Los Términos y Condiciones (T&C) del proveedor de servicios se aplican a todas las interacciones con el sitio web y sus servicios. Se anima a los usuarios a revisar los T&C para obtener información detallada sobre derechos, responsabilidades y limitaciones.",
      close: "Cerrar"
    },
    fr: {
      title: "Mentions Légales",
      companyInfo: "Unternehmensinformationen",
      legalName: "Customated S&A UG:",
      legalForm: "Unternehmergesellschaft (haftungsbeschränkt)",
      address: "August-Bebel-Str. 89 – Haus 7, 14482 Potsdam",
      phone: "+49 0 1781796007:",
      email: "admin (a±) customate.ai",
      website: "www.customate.ai",
      tradeRegister: "HRB 40697 P:",
      taxId: "046/107/05966",
      legalRep: "José Ignacio Orias Calvo",
      termsNotice: "Les Conditions Générales (CG) du fournisseur de services s'appliquent à toutes les interactions avec le site web et ses services. Les utilisateurs sont encouragés à consulter les CG pour des informations détaillées sur les droits, responsabilités et limitations.",
      close: "Fermer"
    },
    zh: {
      title: "法律信息",
      companyInfo: "Unternehmensinformationen",
      legalName: "Customated S&A UG:",
      legalForm: "Unternehmergesellschaft (haftungsbeschränkt)",
      address: "August-Bebel-Str. 89 – Haus 7, 14482 Potsdam",
      phone: "+49 0 1781796007:",
      email: "admin (a±) customate.ai",
      website: "www.customate.ai",
      tradeRegister: "HRB 40697 P:",
      taxId: "046/107/05966",
      legalRep: "José Ignacio Orias Calvo",
      termsNotice: "服务提供商的条款和条件（T&C）适用于与网站及其服务的所有互动。鼓励用户查看T&C以获取有关权利、责任和限制的详细信息。",
      close: "关闭"
    },
    no: {
      title: "Impressum",
      companyInfo: "Unternehmensinformationen",
      legalName: "Customated S&A UG:",
      legalForm: "Unternehmergesellschaft (haftungsbeschränkt)",
      address: "August-Bebel-Str. 89 – Haus 7, 14482 Potsdam",
      phone: "+49 0 1781796007:",
      email: "admin (a±) customate.ai",
      website: "www.customate.ai",
      tradeRegister: "HRB 40697 P:",
      taxId: "046/107/05966",
      legalRep: "José Ignacio Orias Calvo",
      termsNotice: "Vilkårene og betingelsene (V&B) til tjenesteleverandøren gjelder for alle interaksjoner med nettstedet og dets tjenester. Brukere oppfordres til å gjennomgå V&B for detaljert informasjon om rettigheter, ansvar og begrensninger.",
      close: "Lukk"
    }
  };

  const content = imprintContent[i18n.language] || imprintContent.en;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Modal Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Content */}
          <div className="space-y-6 text-sm text-gray-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{content.companyInfo}</h3>
              
              <div className="space-y-2">
                <p><span className="font-medium">{content.legalName}</span> Customated S&A UG (haftungsbeschränkt)</p>
                <p><span className="font-medium">{content.legalForm}</span> Unternehmergesellschaft (haftungsbeschränkt)</p>
                <p><span className="font-medium">{content.address}</span> August-Bebel-Str. 89 – Haus 7, 14482 Potsdam.</p>
                <p><span className="font-medium">{content.phone}</span> +49 0 1781796007</p>
                <p><span className="font-medium">{content.email}</span> admin (a±) customate.ai</p>
                <p><span className="font-medium">{content.website}</span> www.customate.ai</p>
                <p><span className="font-medium">{content.tradeRegister}</span> HRB 40697 P</p>
                <p><span className="font-medium">{content.taxId}</span> 046/107/05966</p>
                <p><span className="font-medium">{content.legalRep}</span> José Ignacio Orias Calvo</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-gray-600 leading-relaxed">
                {content.termsNotice}
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="mt-8 pt-4 border-t">
            <button
              onClick={onClose}
              className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              {content.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Footer = () => {
  const { i18n } = useTranslation();
  const [imprintModalOpen, setImprintModalOpen] = useState(false);
  
  const currentYear = new Date().getFullYear();

  // Multilingual content
  const translations = {
    en: {
      description: "Automate Customer Support",
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
      imprint: "Imprint",
      rights: `© ${currentYear} Customated S&A UG. All rights reserved.`,
      madeIn: "Made in Germany 🇩🇪"
    },
    de: {
      description: "Automatisieren Sie den Kundensupport",
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
      imprint: "Impressum",
      rights: `© ${currentYear} Customated S&A UG. Alle Rechte vorbehalten.`,
      madeIn: "Made in Germany 🇩🇪"
    },
    es: {
      description: "Automatiza la Atención al Cliente",
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
      imprint: "Aviso Legal",
      rights: `© ${currentYear} Customated S&A UG. Todos los derechos reservados.`,
      madeIn: "Hecho en Alemania 🇩🇪"
    },
    fr: {
      description: "Automatiser le Support Client",
      product: "Produit",
      company: "Entreprise",
      features: "Fonctionnalités",
      pricing: "Tarifs",
      blog: "Blog",
      contact: "Contact",
      aboutUs: "À Propos",
      terms: "Conditions d'Utilisation",
      privacy: "Politique de Confidentialité",
      cookies: "Politique des Cookies",
      imprint: "Mentions Légales",
      rights: `© ${currentYear} Customated S&A UG. Tous droits réservés.`,
      madeIn: "Fabriqué en Allemagne 🇩🇪"
    },
    zh: {
      description: "自动化客户支持",
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
      imprint: "法律信息",
      rights: `© ${currentYear} Customated S&A UG. 保留所有权利。`,
      madeIn: "德国制造 🇩🇪"
    },
    no: {
      description: "Automatiser Kundestøtte",
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
      imprint: "Impressum",
      rights: `© ${currentYear} Customated S&A UG. Alle rettigheter forbeholdt.`,
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
      
      if (window.location.pathname !== '/') { // <-- Use window.location
        window.location.href = href;
      } else {
        scrollToSection(sectionId);
      }
    }
  };

  return (
    <>
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-12">
          
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-8">
            
            {/* Company Info */}
            <div className="lg:col-span-1">
              <div className="flex items-center mb-6">
                {/* Footer Logo - Round white background */}
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 mr-3">
                  <img 
                    src="/assets/customate-logo.svg" 
                    alt="Customate.ai Logo" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                  Customate.ai
                </span>
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
                    <a
                      href="/pricing"
                      className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                    >
                      {currentLang.pricing}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/blog"
                      className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                    >
                      {currentLang.blog}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/contact"
                      className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                    >
                      {currentLang.contact}
                    </a>
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
                    <a
                      href="/about"
                      className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                    >
                      {currentLang.aboutUs}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/terms"
                      className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                    >
                      {currentLang.terms}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/privacy"
                      className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                    >
                      {currentLang.privacy}
                    </a>
                  </li>
                  <li>
                    <a
                      href="/cookies"
                      className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                    >
                      {currentLang.cookies}
                    </a>
                  </li>
                  <li>
                    <button
                      onClick={() => setImprintModalOpen(true)}
                      className="text-gray-600 hover:text-orange-600 text-sm transition-colors text-left"
                    >
                      {currentLang.imprint}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-gray-100 flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">

          </div>
        </div>
      </footer>

      {/* Imprint Modal */}
      <ImprintModal 
        isOpen={imprintModalOpen} 
        onClose={() => setImprintModalOpen(false)}
        currentLang={currentLang}
      />
    </>
  );
};

export default Footer;