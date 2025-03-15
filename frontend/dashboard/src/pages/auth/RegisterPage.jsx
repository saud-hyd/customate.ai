import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

const RegisterForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    industry: 'e-commerce',
    website: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Call the registration service
      const response = await authService.register(formData);
      console.log('Registration successful:', response);
      
      // Redirect to login page
      navigate('/login', { state: { message: 'Registration successful! Please login with your credentials.' } });
    } catch (error) {
      console.error('Registration error:', error);
      setSubmitError('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Create Your Account</h2>
      
      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          <p>{submitError}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Company Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            placeholder="Your company name"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            placeholder="you@example.com"
          />
        </div>
        
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
            Industry
          </label>
          <select
            id="industry"
            name="industry"
            value={formData.industry}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="e-commerce">E-commerce</option>
            <option value="saas">SaaS</option>
            <option value="healthcare">Healthcare</option>
            <option value="finance">Finance</option>
            <option value="education">Education</option>
            <option value="retail">Retail</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Website (Optional)
          </label>
          <input
            id="website"
            name="website"
            type="text"
            value={formData.website}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            placeholder="https://example.com"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            placeholder="Create a secure password"
          />
        </div>
        
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;