// src/components/ui/FeedbackModal.jsx
import React, { useState } from 'react';

const FeedbackModal = ({ isOpen, onClose }) => {
  const [feedbackText, setFeedbackText] = useState('');
  
  const handleSubmit = () => {
    if (feedbackText.trim()) {
      const mailtoLink = `mailto:admin@customate.ai?subject=${encodeURIComponent(
        'Feedback for Customate'
      )}&body=${encodeURIComponent(feedbackText)}`;
      window.location.href = mailtoLink;
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: 'block' }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>We Value Your Feedback</h3>
          <span className="close" onClick={onClose}>&times;</span>
        </div>
        <div className="modal-body">
          <p>Help us improve our product — what can we do better? Also, please tell us about any customer service challenge you face in your business.</p>
          <textarea 
            id="feedbackInput" 
            placeholder="Your feedback here..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          ></textarea>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit}>Send Feedback</button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;