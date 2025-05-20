import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import SectionContainer from '../components/ui/SectionContainer';
import FeaturesSection from '../components/sections/FeaturesSection';
import CTASection from '../components/sections/CTASection';

// Truly simple, meaningful, and attractive illustrations
const RagIllustration = () => (
  <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="ragBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E1F5FE" />
        <stop offset="100%" stopColor="#BBDEFB" />
      </linearGradient>
      <linearGradient id="docsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#2196F3" />
        <stop offset="100%" stopColor="#0D47A1" />
      </linearGradient>
      <linearGradient id="searchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1E88E5" />
        <stop offset="100%" stopColor="#1565C0" />
      </linearGradient>
      <linearGradient id="answerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#64B5F6" />
        <stop offset="100%" stopColor="#1976D2" />
      </linearGradient>
      <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#64B5F6" floodOpacity="0.3"/>
      </filter>
    </defs>
    
    {/* Background with subtle gradient */}
    <rect x="50" y="50" width="500" height="300" rx="20" fill="url(#ragBg)" filter="url(#dropShadow)" />
    
    {/* Knowledge base - left panel */}
    <rect x="100" y="100" width="140" height="180" rx="10" fill="white" stroke="#2196F3" strokeWidth="2" filter="url(#dropShadow)" />
    <rect x="100" y="100" width="140" height="30" rx="10" fill="url(#docsGrad)" />
    <text x="115" y="122" fontFamily="Arial" fontSize="14" fontWeight="bold" fill="white">Documents</text>

    {/* Document lines */}
    <rect x="115" y="145" width="110" height="6" rx="3" fill="#E3F2FD" />
    <rect x="115" y="165" width="90" height="6" rx="3" fill="#E3F2FD" />
    <rect x="115" y="185" width="110" height="6" rx="3" fill="#E3F2FD" />
    <rect x="115" y="205" width="80" height="6" rx="3" fill="#E3F2FD" />
    <rect x="115" y="225" width="100" height="6" rx="3" fill="#E3F2FD" />
    <rect x="115" y="245" width="70" height="6" rx="3" fill="#E3F2FD" />
    
    {/* Arrow with gradient */}
    <path d="M260 180 L300 180" stroke="url(#searchGrad)" strokeWidth="3" strokeLinecap="round" />
    <path d="M295 173 L302 180 L295 187" fill="none" stroke="url(#searchGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    
    {/* Search processing - center */}
    <circle cx="330" cy="180" r="35" fill="white" stroke="#2196F3" strokeWidth="2" filter="url(#dropShadow)" />
    <circle cx="330" cy="170" r="15" fill="none" stroke="#2196F3" strokeWidth="2" />
    <line x1="340" y1="185" x2="352" y2="197" stroke="#2196F3" strokeWidth="2" strokeLinecap="round" />
    <text x="312" y="218" fontFamily="Arial" fontSize="12" fontWeight="bold" fill="#1976D2">Search</text>
    
    {/* Arrow with gradient */}
    <path d="M365 180 L405 180" stroke="url(#searchGrad)" strokeWidth="3" strokeLinecap="round" />
    <path d="M400 173 L407 180 L400 187" fill="none" stroke="url(#searchGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    
    {/* Answer panel - right */}
    <rect x="420" y="100" width="140" height="180" rx="10" fill="white" stroke="#2196F3" strokeWidth="2" filter="url(#dropShadow)" />
    <rect x="420" y="100" width="140" height="30" rx="10" fill="url(#answerGrad)" />
    <text x="465" y="122" fontFamily="Arial" fontSize="14" fontWeight="bold" fill="white">Answer</text>
    
    {/* Answer lines */}
    <rect x="435" y="145" width="110" height="6" rx="3" fill="#E3F2FD" />
    <rect x="435" y="165" width="90" height="6" rx="3" fill="#E3F2FD" />
    <rect x="435" y="185" width="110" height="6" rx="3" fill="#E3F2FD" />
    <rect x="435" y="205" width="80" height="6" rx="3" fill="#E3F2FD" />
    <rect x="435" y="225" width="100" height="6" rx="3" fill="#E3F2FD" />
    <rect x="435" y="245" width="70" height="6" rx="3" fill="#E3F2FD" />
    
    {/* Citation connection */}
    <path d="M420 185 L240 185" stroke="#2196F3" strokeWidth="1.5" strokeDasharray="4,2" />
    <circle cx="240" cy="185" r="4" fill="#2196F3" />
    <circle cx="420" cy="185" r="4" fill="#2196F3" />
  </svg>
);

const MultiTenantIllustration = () => (
  <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="tenantBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF8E1" />
        <stop offset="100%" stopColor="#FFECB3" />
      </linearGradient>
      <linearGradient id="serverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFA000" />
        <stop offset="100%" stopColor="#FF6F00" />
      </linearGradient>
      <linearGradient id="clientGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFD54F" />
        <stop offset="100%" stopColor="#FFC107" />
      </linearGradient>
      <filter id="tenantShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#FFA000" floodOpacity="0.2"/>
      </filter>
    </defs>
    
    {/* Background with subtle gradient */}
    <rect x="50" y="50" width="500" height="300" rx="20" fill="url(#tenantBg)" filter="url(#tenantShadow)" />
    
    {/* Central secure server */}
    <rect x="275" y="150" width="50" height="100" rx="8" fill="white" stroke="#FFA000" strokeWidth="2" filter="url(#tenantShadow)" />
    <rect x="275" y="150" width="50" height="30" rx="8" fill="url(#serverGrad)" />
    <text x="287" y="170" fontFamily="Arial" fontSize="10" fontWeight="bold" fill="white">Server</text>
    
    {/* Server details */}
    <circle cx="300" cy="200" r="15" fill="#FFF8E1" stroke="#FFA000" strokeWidth="1" />
    <rect x="293" y="193" width="14" height="14" rx="2" fill="#FFA000" />
    <rect x="298" y="197" width="4" height="6" fill="white" />
    
    {/* Clients with isolation */}
    <g>
      {/* Left client */}
      <rect x="100" y="140" width="120" height="60" rx="10" fill="white" stroke="#FFA000" strokeWidth="2" filter="url(#tenantShadow)" />
      <rect x="100" y="140" width="120" height="25" rx="10" fill="url(#clientGrad)" />
      <text x="135" y="158" fontFamily="Arial" fontSize="12" fontWeight="bold" fill="white">Client A</text>
      
      {/* Connection with shield */}
      <path d="M220 170 L275 180" stroke="#FFA000" strokeWidth="1.5" strokeDasharray="3,2" />
      <path d="M240 160 C 240 150, 250 150, 250 160" stroke="#FFA000" strokeWidth="2" fill="none" />
      <circle cx="245" cy="155" r="5" fill="#FFD54F" />
    </g>
    
    <g>
      {/* Top client */}
      <rect x="240" y="70" width="120" height="60" rx="10" fill="white" stroke="#FFA000" strokeWidth="2" filter="url(#tenantShadow)" />
      <rect x="240" y="70" width="120" height="25" rx="10" fill="url(#clientGrad)" />
      <text x="275" y="88" fontFamily="Arial" fontSize="12" fontWeight="bold" fill="white">Client B</text>
      
      {/* Connection with shield */}
      <path d="M300 130 L300 150" stroke="#FFA000" strokeWidth="1.5" strokeDasharray="3,2" />
      <path d="M290 140 C 290 130, 310 130, 310 140" stroke="#FFA000" strokeWidth="2" fill="none" />
      <circle cx="300" cy="135" r="5" fill="#FFD54F" />
    </g>
    
    <g>
      {/* Right client */}
      <rect x="380" y="140" width="120" height="60" rx="10" fill="white" stroke="#FFA000" strokeWidth="2" filter="url(#tenantShadow)" />
      <rect x="380" y="140" width="120" height="25" rx="10" fill="url(#clientGrad)" />
      <text x="415" y="158" fontFamily="Arial" fontSize="12" fontWeight="bold" fill="white">Client C</text>
      
      {/* Connection with shield */}
      <path d="M380 170 L325 180" stroke="#FFA000" strokeWidth="1.5" strokeDasharray="3,2" />
      <path d="M350 160 C 350 150, 360 150, 360 160" stroke="#FFA000" strokeWidth="2" fill="none" />
      <circle cx="355" cy="155" r="5" fill="#FFD54F" />
    </g>
    
    {/* Bottom client */}
    <rect x="240" y="270" width="120" height="60" rx="10" fill="white" stroke="#FFA000" strokeWidth="2" filter="url(#tenantShadow)" />
    <rect x="240" y="270" width="120" height="25" rx="10" fill="url(#clientGrad)" />
    <text x="275" y="288" fontFamily="Arial" fontSize="12" fontWeight="bold" fill="white">Client D</text>
    
    {/* Connection with shield */}
    <path d="M300 270 L300 250" stroke="#FFA000" strokeWidth="1.5" strokeDasharray="3,2" />
    <path d="M290 260 C 290 250, 310 250, 310 260" stroke="#FFA000" strokeWidth="2" fill="none" />
    <circle cx="300" cy="255" r="5" fill="#FFD54F" />
    
    {/* Label with styling */}
    <rect x="230" y="210" width="140" height="24" rx="12" fill="rgba(255, 160, 0, 0.1)" stroke="#FFA000" strokeWidth="1" />
    <text x="255" y="226" fontFamily="Arial" fontSize="12" fontWeight="bold" fill="#FFA000">Isolated Tenants</text>
  </svg>
);

const DocumentProcessingIllustration = () => (
  <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="docBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F3E5F5" />
        <stop offset="100%" stopColor="#E1BEE7" />
      </linearGradient>
      <linearGradient id="pdfGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#9C27B0" />
        <stop offset="100%" stopColor="#7B1FA2" />
      </linearGradient>
      <linearGradient id="docGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3F51B5" />
        <stop offset="100%" stopColor="#303F9F" />
      </linearGradient>
      <linearGradient id="pptGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FF5722" />
        <stop offset="100%" stopColor="#E64A19" />
      </linearGradient>
      <linearGradient id="xlsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4CAF50" />
        <stop offset="100%" stopColor="#388E3C" />
      </linearGradient>
      <linearGradient id="processGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#9C27B0" />
        <stop offset="100%" stopColor="#7B1FA2" />
      </linearGradient>
      <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#CE93D8" />
        <stop offset="100%" stopColor="#9C27B0" />
      </linearGradient>
      <filter id="docShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#9C27B0" floodOpacity="0.2"/>
      </filter>
      <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
        <feOffset in="blur" dx="1" dy="1" result="offsetBlur"/>
        <feComposite in="SourceGraphic" in2="offsetBlur" operator="over"/>
      </filter>
    </defs>
    
    {/* Background with subtle gradient */}
    <rect x="50" y="50" width="500" height="300" rx="20" fill="url(#docBg)" filter="url(#docShadow)" />
    
    {/* Header title with improved styling */}
    <rect x="175" y="70" width="250" height="36" rx="18" fill="rgba(156, 39, 176, 0.15)" stroke="#9C27B0" strokeWidth="1.5" />
    <text x="230" y="94" fontFamily="Arial" fontSize="16" fontWeight="bold" fill="#9C27B0">Document Processing</text>
    
    {/* Document flow - curved path */}
    <path d="M100,175 C150,120 250,230 300,175 C350,120 450,230 500,175" 
          fill="none" stroke="#9C27B0" strokeWidth="1.5" strokeDasharray="5,3" strokeOpacity="0.4" />
    
    {/* Document icons with realistic details */}
    <g>
      {/* PDF document */}
      <rect x="100" y="140" width="60" height="70" rx="5" fill="white" stroke="#9C27B0" strokeWidth="2" filter="url(#docShadow)" />
      <rect x="100" y="140" width="60" height="22" rx="5" fill="url(#pdfGrad)" />
      <text x="115" y="157" fontFamily="Arial" fontSize="13" fontWeight="bold" fill="white">PDF</text>
      
      {/* PDF document internals */}
      <rect x="110" y="170" width="40" height="4" rx="2" fill="#F3E5F5" />
      <rect x="110" y="180" width="35" height="4" rx="2" fill="#F3E5F5" />
      <rect x="110" y="190" width="40" height="4" rx="2" fill="#F3E5F5" />
      <rect x="110" y="200" width="30" height="4" rx="2" fill="#F3E5F5" />
      
      {/* PDF document fold */}
      <path d="M145,140 L160,155 L145,155 Z" fill="#7B1FA2" />
      
      {/* DOCX document */}
      <rect x="170" y="140" width="60" height="70" rx="5" fill="white" stroke="#3F51B5" strokeWidth="2" filter="url(#docShadow)" />
      <rect x="170" y="140" width="60" height="22" rx="5" fill="url(#docGrad)" />
      <text x="182" y="157" fontFamily="Arial" fontSize="13" fontWeight="bold" fill="white">DOCX</text>
      
      {/* DOCX document internals */}
      <rect x="180" y="170" width="40" height="4" rx="2" fill="#E8EAF6" />
      <rect x="180" y="180" width="35" height="4" rx="2" fill="#E8EAF6" />
      <rect x="180" y="190" width="40" height="4" rx="2" fill="#E8EAF6" />
      <rect x="180" y="200" width="30" height="4" rx="2" fill="#E8EAF6" />
      
      {/* DOCX document fold */}
      <path d="M215,140 L230,155 L215,155 Z" fill="#303F9F" />
      
      {/* PPT document */}
      <rect x="240" y="140" width="60" height="70" rx="5" fill="white" stroke="#FF5722" strokeWidth="2" filter="url(#docShadow)" />
      <rect x="240" y="140" width="60" height="22" rx="5" fill="url(#pptGrad)" />
      <text x="255" y="157" fontFamily="Arial" fontSize="13" fontWeight="bold" fill="white">PPT</text>
      
      {/* PPT document internals - slide layout */}
      <rect x="250" y="170" width="40" height="20" rx="2" fill="#FBE9E7" />
      <rect x="250" y="195" width="25" height="4" rx="2" fill="#FBE9E7" />
      <rect x="250" y="203" width="20" height="4" rx="2" fill="#FBE9E7" />
      
      {/* PPT document fold */}
      <path d="M285,140 L300,155 L285,155 Z" fill="#E64A19" />
      
      {/* XLS document */}
      <rect x="310" y="140" width="60" height="70" rx="5" fill="white" stroke="#4CAF50" strokeWidth="2" filter="url(#docShadow)" />
      <rect x="310" y="140" width="60" height="22" rx="5" fill="url(#xlsGrad)" />
      <text x="325" y="157" fontFamily="Arial" fontSize="13" fontWeight="bold" fill="white">XLS</text>
      
      {/* XLS document internals - spreadsheet grid */}
      <rect x="320" y="170" width="40" height="30" rx="2" fill="#E8F5E9" />
      <line x1="330" y1="170" x2="330" y2="200" stroke="#C8E6C9" strokeWidth="1" />
      <line x1="340" y1="170" x2="340" y2="200" stroke="#C8E6C9" strokeWidth="1" />
      <line x1="320" y1="180" x2="360" y2="180" stroke="#C8E6C9" strokeWidth="1" />
      <line x1="320" y1="190" x2="360" y2="190" stroke="#C8E6C9" strokeWidth="1" />
      
      {/* XLS document fold */}
      <path d="M355,140 L370,155 L355,155 Z" fill="#388E3C" />
    </g>
    
    {/* Processing module - central element */}
    <g>
      {/* Processing container */}
      <rect x="395" y="125" width="110" height="150" rx="10" fill="white" stroke="#9C27B0" strokeWidth="2" filter="url(#docShadow)" />
      <rect x="395" y="125" width="110" height="30" rx="10" fill="url(#processGrad)" />
      <text x="415" y="147" fontFamily="Arial" fontSize="14" fontWeight="bold" fill="white">Processor</text>
      
      {/* Processing gears - animated look */}
      <circle cx="425" cy="185" r="22" fill="url(#gearGrad)" />
      <circle cx="425" cy="185" r="12" fill="white" />
      <path d="M425,160 L425,167" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M425,203 L425,210" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M400,185 L407,185" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M443,185 L450,185" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M408,168 L413,173" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M437,197 L442,202" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M408,202 L413,197" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M437,173 L442,168" stroke="white" strokeWidth="3" strokeLinecap="round" />
      
      {/* Second gear */}
      <circle cx="470" cy="205" r="18" fill="url(#gearGrad)" />
      <circle cx="470" cy="205" r="10" fill="white" />
      <path d="M470,185 L470,191" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M470,219 L470,225" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M450,205 L456,205" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M484,205 L490,205" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M456,191 L460,195" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M480,215 L484,219" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M456,219 L460,215" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M480,195 L484,191" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* Third gear */}
      <circle cx="470" cy="165" r="15" fill="url(#gearGrad)" opacity="0.8" />
      <circle cx="470" cy="165" r="8" fill="white" />
      <path d="M470,148 L470,152" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M470,178 L470,182" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M453,165 L457,165" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M483,165 L487,165" stroke="white" strokeWidth="2" strokeLinecap="round" />
    
      {/* Processing lines - data flow indicators */}
      <rect x="410" y="240" width="80" height="5" rx="2.5" fill="#E1BEE7" />
      <rect x="415" y="250" width="70" height="5" rx="2.5" fill="#E1BEE7" />
      <rect x="420" y="260" width="60" height="5" rx="2.5" fill="#E1BEE7" />
    </g>
    
    {/* Output database/knowledge base */}
    <g>
      {/* Database cylinder */}
      <ellipse cx="530" cy="165" rx="25" ry="10" fill="white" stroke="#9C27B0" strokeWidth="2" />
      <rect x="505" y="165" width="50" height="55" fill="white" stroke="#9C27B0" strokeWidth="2" />
      <ellipse cx="530" cy="220" rx="25" ry="10" fill="white" stroke="#9C27B0" strokeWidth="2" />
      
      {/* Database details */}
      <ellipse cx="530" cy="165" rx="20" ry="6" fill="url(#processGrad)" opacity="0.5" />
      <rect x="510" y="175" width="40" height="4" rx="2" fill="#F3E5F5" />
      <rect x="510" y="185" width="40" height="4" rx="2" fill="#F3E5F5" />
      <rect x="510" y="195" width="40" height="4" rx="2" fill="#F3E5F5" />
      <rect x="510" y="205" width="40" height="4" rx="2" fill="#F3E5F5" />
    </g>
    
    {/* Connection arrows between elements */}
    <path d="M370 175 C 380 175, 385 175, 395 175" stroke="#9C27B0" strokeWidth="3" strokeLinecap="round" />
    <path d="M388 168 L395 175 L388 182" fill="none" stroke="#9C27B0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    
    <path d="M505 190 C 495 190, 490 190, 480 190" stroke="#9C27B0" strokeWidth="3" strokeLinecap="round" />
    <path d="M487 183 L480 190 L487 197" fill="none" stroke="#9C27B0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AnalyticsIllustration = () => (
  <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="analyticsBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF2F2" />
        <stop offset="100%" stopColor="#FEE2E2" />
      </linearGradient>
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#DC2626" />
      </linearGradient>
      <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#FCA5A5" />
      </linearGradient>
      <linearGradient id="pieGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#B91C1C" />
      </linearGradient>
      <linearGradient id="pieGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FCA5A5" />
        <stop offset="100%" stopColor="#EF4444" />
      </linearGradient>
      <linearGradient id="pieGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FECACA" />
        <stop offset="100%" stopColor="#FCA5A5" />
      </linearGradient>
      <linearGradient id="pieGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEE2E2" />
        <stop offset="100%" stopColor="#FECACA" />
      </linearGradient>
    </defs>
    
    {/* Background */}
    <rect x="50" y="50" width="500" height="300" rx="20" fill="url(#analyticsBg)" />
    
    {/* Dashboard */}
    <rect x="100" y="80" width="400" height="240" rx="10" fill="#FFFFFF" stroke="#EF4444" strokeWidth="2.5" />
    <rect x="100" y="80" width="400" height="35" rx="10" fill="url(#headerGrad)" />
    <text x="230" y="105" fontFamily="Arial" fontSize="16" fontWeight="bold" fill="white">Analytics Dashboard</text>
    
    {/* Bar Chart */}
    <rect x="120" y="130" width="170" height="170" rx="8" fill="#FFFFFF" stroke="#EF4444" strokeWidth="1.5" />
    <text x="135" y="150" fontFamily="Arial" fontSize="14" fontWeight="bold" fill="#EF4444">Conversation Volume</text>
    <rect x="140" y="250" width="20" height="30" rx="4" fill="url(#barGradient)" />
    <rect x="170" y="220" width="20" height="60" rx="4" fill="url(#barGradient)" />
    <rect x="200" y="200" width="20" height="80" rx="4" fill="url(#barGradient)" />
    <rect x="230" y="170" width="20" height="110" rx="4" fill="url(#barGradient)" />
    <rect x="260" y="190" width="20" height="90" rx="4" fill="url(#barGradient)" />
    <path d="M130 280 L280 280" stroke="#EF4444" strokeWidth="2" />
    <path d="M130 200 L280 200" stroke="#EF4444" strokeWidth="0.5" strokeDasharray="3,3" />
    <path d="M130 240 L280 240" stroke="#EF4444" strokeWidth="0.5" strokeDasharray="3,3" />
    
    {/* Pie Chart */}
    <rect x="310" y="130" width="170" height="170" rx="8" fill="#FFFFFF" stroke="#EF4444" strokeWidth="1.5" />
    <text x="355" y="150" fontFamily="Arial" fontSize="14" fontWeight="bold" fill="#EF4444">Topic Analysis</text>
    <circle cx="395" cy="215" r="60" fill="transparent" stroke="#EF4444" strokeWidth="2" />
    <path d="M395 215 L395 155 A60 60 0 0 1 448 240 Z" fill="url(#pieGrad1)" />
    <path d="M395 215 L448 240 A60 60 0 0 1 365 270 Z" fill="url(#pieGrad2)" />
    <path d="M395 215 L365 270 A60 60 0 0 1 342 185 Z" fill="url(#pieGrad3)" />
    <path d="M395 215 L342 185 A60 60 0 0 1 395 155 Z" fill="url(#pieGrad4)" />
    <circle cx="395" cy="215" r="20" fill="#FFFFFF" />
  </svg>
);

const FeaturesPage = () => {
  const detailedFeatures = [
    {
      title: "Retrieval-Augmented Generation (RAG)",
      description: "Customate.ai uses advanced RAG technology to provide highly accurate responses based on your specific knowledge base.",
      details: [
        "Automatically processes and indexes uploaded documents",
        "Semantically searches your content to find the most relevant information",
        "Generates natural language responses using retrieved content",
        "Cites sources for information transparency",
        "Continuously improves with usage"
      ],
      illustration: <RagIllustration />,
      background: "bg-blue-50"
    },
    {
      title: "Multi-tenant Architecture",
      description: "Built with enterprise-grade security and scalability to ensure data isolation and optimal performance.",
      details: [
        "Complete data isolation between clients",
        "Scalable infrastructure that grows with your needs",
        "Robust authentication and authorization",
        "Role-based access control",
        "Comprehensive audit logging"
      ],
      illustration: <MultiTenantIllustration />,
      background: "bg-yellow-50"
    },
    {
      title: "Document Processing",
      description: "Upload and process various document types to automatically build your knowledge base.",
      details: [
        "Support for PDFs, DOCs, PPTs, spreadsheets, and more",
        "Intelligent content extraction and structuring",
        "Automatic categorization and tagging",
        "Image and table recognition",
        "Regular re-indexing to keep content fresh"
      ],
      illustration: <DocumentProcessingIllustration />,
      background: "bg-purple-50"
    },
    {
      title: "Analytics Dashboard",
      description: "Gain valuable insights into how users interact with your chatbot and continuously improve performance.",
      details: [
        "Conversation volume and user engagement metrics",
        "Common questions and topic analysis",
        "Satisfaction scores and feedback tracking",
        "Conversion and goal completion rates",
        "Custom reports and data export"
      ],
      illustration: <AnalyticsIllustration />,
      background: "bg-red-50"
    }
  ];

  return (
    <>
      <Helmet>
        <title>Features - Customate.ai | AI Chatbot Platform</title>
        <meta 
          name="description" 
          content="Explore Customate.ai's powerful features including RAG implementation, multi-tenant architecture, document processing, and analytics." 
        />
      </Helmet>
      
      <SectionContainer background="light" paddingY="py-20 md:py-28">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Powerful Features for Intelligent Chatbots
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Discover how Customate.ai's comprehensive feature set helps you build, deploy, and optimize AI chatbots for your business.
          </p>
        </div>
      </SectionContainer>
      
      <FeaturesSection />
      
      {/* Detailed features section */}
      <SectionContainer background="white" paddingY="py-16 md:py-24">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Dive Deeper Into Our Features
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            Everything you need to create intelligent, responsive chatbots that deliver real business value.
          </p>
        </div>
        
        <div className="space-y-16">
          {detailedFeatures.map((feature, index) => (
            <div key={index} className="relative">
              <div className={`absolute inset-0 ${feature.background} rounded-3xl transform -rotate-1 scale-105 -z-10`}></div>
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="lg:flex">
                  <div className="lg:w-1/2 p-8 lg:p-10">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="mt-4 text-lg text-gray-600">
                      {feature.description}
                    </p>
                    <ul className="mt-6 space-y-3">
                      {feature.details.map((detail, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.1 }}
                          viewport={{ once: true }}
                          className="flex items-start"
                        >
                          <svg className="h-6 w-6 text-primary-500 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="ml-3 text-gray-700">{detail}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                  <div className="lg:w-1/2 bg-gray-50 flex items-center justify-center p-8">
                    <div className="w-full max-w-md h-full max-h-80">
                      {feature.illustration}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionContainer>
      
      {/* Integrations section */}
      <SectionContainer background="light" paddingY="py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Seamless Integrations
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            Connect Customate.ai with your favorite tools and platforms
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {[
            'Salesforce', 'Hubspot', 'Zendesk', 'Shopify', 
            'Slack', 'Microsoft Teams', 'Google Analytics', 'Zapier',
            'Intercom', 'Mailchimp', 'WordPress', 'Stripe'
          ].map((integration, i) => (
            <div key={i} className="flex items-center justify-center p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <span className="text-gray-900 font-medium">{integration}</span>
            </div>
          ))}
        </div>
      </SectionContainer>
      
      <CTASection />
    </>
  );
};

export default FeaturesPage;