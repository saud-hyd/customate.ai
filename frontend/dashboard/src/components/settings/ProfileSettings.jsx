// src/components/settings/ProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';
import userService from '../../services/userService';

/**
 * Profile settings component for user profile management
 * Allows editing personal and account information
 */
const ProfileSettings = () => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Fetch user profile on component mount
  useEffect(() => {
    fetchProfile();
  }, []);
  
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await userService.getProfile();
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await userService.updateProfile(profile);
      setSuccess('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Card title="Profile Settings">
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert 
              type="error" 
              message={error} 
              onClose={() => setError(null)} 
              showClose={true} 
              className="mb-4"
            />
          )}
          
          {success && (
            <Alert 
              type="success" 
              message={success} 
              onClose={() => setSuccess(null)} 
              showClose={true} 
              className="mb-4"
            />
          )}
          
          <div className="space-y-4">
            <Input
              label="Name"
              name="name"
              value={profile.name}
              onChange={handleChange}
              required
            />
            
            <Input
              label="Email"
              name="email"
              type="email"
              value={profile.email}
              onChange={handleChange}
              required
            />
            
            <Input
              label="Company"
              name="company"
              value={profile.company}
              onChange={handleChange}
            />
            
            <Input
              label="Phone"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
            />
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Card>
  );
};

export default ProfileSettings;