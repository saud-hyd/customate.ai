// src/components/ui/ContactModal.jsx
import React, { useState } from 'react';

const ContactModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id.replace('contact', '').toLowerCase()]: value
    }));
  };
  
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = () => {
    const { name, email, message } = formData;
    
    // Simple validation
    if (!name || !email || !message) {
      alert('Please fill in all fields.');
      return;
    }
    
    if (!isValidEmail(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    
    const mailtoLink = `mailto:admin@customate.ai?subject=${encodeURIComponent(
      'Contact from ' + name
    )}&body=${encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    )}`;
    window.location.href = mailtoLink;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: 'block' }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Contact Our Team</h3>
          <span className="close" onClick={onClose}>&times;</span>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="contactName">Name</label>
            <input 
              type="text" 
              id="contactName" 
              placeholder="Your name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="contactEmail">Email</label>
            <input 
              type="email" 
              id="contactEmail" 
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="contactMessage">Message</label>
            <textarea 
              id="contactMessage" 
              placeholder="How can we help you?"
              value={formData.message}
              onChange={handleChange}
            ></textarea>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit}>Send Message</button>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;