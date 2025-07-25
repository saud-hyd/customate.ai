import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import teamService from '../../services/teamService';

const TeamMembersSection = ({ setError, setSuccess }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [totalTeamSlots, setTotalTeamSlots] = useState(5); // Default value

  // Fetch team members on component mount
  useEffect(() => {
    fetchTeamMembers();
    fetchSubscriptionInfo();
  }, []);

  const fetchTeamMembers = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from your API
      // const response = await teamService.getTeamMembers();
      // setMembers(response.data);
      
      // Mocked data for demonstration
      setTimeout(() => {
        setMembers([
          {
            id: '1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'Admin',
            roleDescription: 'Full access',
            status: 'Active',
            lastActive: new Date(),
            initials: 'JD'
          },
          {
            id: '2',
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            role: 'Editor',
            roleDescription: 'Can edit content',
            status: 'Active',
            lastActive: new Date(Date.now() - 3600000), // 1 hour ago
            initials: 'JS'
          },
          {
            id: '3',
            name: 'Robert Johnson',
            email: 'robert.johnson@example.com',
            role: 'Viewer',
            roleDescription: 'Read-only view',
            status: 'Invited',
            lastActive: null,
            initials: 'RJ'
          }
        ]);
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError('Failed to load team members');
      setLoading(false);
    }
  };

  const fetchSubscriptionInfo = async () => {
    try {
      // In a real implementation, this would fetch from your API
      // const response = await subscriptionService.getCurrentSubscription();
      // setTotalTeamSlots(response.data.team_members_limit);
      
      // Mocked data
      setTotalTeamSlots(5);
    } catch (err) {
      console.error('Error fetching subscription info:', err);
    }
  };

  const inviteFormSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email address').required('Email is required'),
    role: Yup.string().required('Role is required')
  });

  const inviteForm = useFormik({
    initialValues: {
      email: '',
      role: 'Viewer'
    },
    validationSchema: inviteFormSchema,
    onSubmit: async (values, { resetForm }) => {
      setLoading(true);
      try {
        // In a real implementation, this would send to your API
        // await teamService.inviteMember(values);
        
        // Mock successful invitation
        setTimeout(() => {
          const newMember = {
            id: Date.now().toString(),
            name: values.email.split('@')[0],
            email: values.email,
            role: values.role,
            roleDescription: values.role === 'Admin' ? 'Full access' : 
                            values.role === 'Editor' ? 'Can edit content' : 'Read-only view',
            status: 'Invited',
            lastActive: null,
            initials: values.email.charAt(0).toUpperCase() + values.email.split('@')[0].charAt(1).toUpperCase()
          };
          
          setMembers([...members, newMember]);
          setSuccess('Invitation sent successfully');
          setInviteModalOpen(false);
          resetForm();
          setLoading(false);
        }, 500);
      } catch (err) {
        console.error('Error inviting team member:', err);
        setError('Failed to send invitation');
        setLoading(false);
      }
    }
  });

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;    
    setLoading(true);
    try {
      // In a real implementation, this would send to your API
      // await teamService.removeMember(memberId);
      
      // Mock successful removal
      setTimeout(() => {
        const updatedMembers = members.filter(member => member.id !== memberId);
        setMembers(updatedMembers);
        setSuccess('Team member removed successfully');
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error('Error removing team member:', err);
      setError('Failed to remove team member');
      setLoading(false);
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    editForm.setValues({
      id: member.id,
      role: member.role
    });
    setInviteModalOpen(true);
  };

  const editFormSchema = Yup.object().shape({
    role: Yup.string().required('Role is required')
  });

  const editForm = useFormik({
    initialValues: {
      id: '',
      role: 'Viewer'
    },
    validationSchema: editFormSchema,
    onSubmit: async (values, { resetForm }) => {
      setLoading(true);
      try {
        // In a real implementation, this would send to your API
        // await teamService.updateMember(values.id, { role: values.role });
        
        // Mock successful update
        setTimeout(() => {
          const updatedMembers = members.map(member => {
            if (member.id === values.id) {
              return {
                ...member,
                role: values.role,
                roleDescription: values.role === 'Admin' ? 'Full access' : 
                                values.role === 'Editor' ? 'Can edit content' : 'Read-only view'
              };
            }
            return member;
          });
          
          setMembers(updatedMembers);
          setSuccess('Team member updated successfully');
          setInviteModalOpen(false);
          setEditingMember(null);
          resetForm();
          setLoading(false);
        }, 500);
      } catch (err) {
        console.error('Error updating team member:', err);
        setError('Failed to update team member');
        setLoading(false);
      }
    }
  });

  // Format relative time for last active
  const formatLastActive = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage who has access to your chatbot dashboard and what they can do.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingMember(null);
            inviteForm.resetForm();
            setInviteModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          disabled={members.length >= totalTeamSlots}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
          </svg>
          Invite Member
        </button>
      </div>

      {/* Team members list */}
      <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && members.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading team members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                    No team members found. Invite someone to get started.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-medium">{member.initials}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{member.role}</div>
                      <div className="text-xs text-gray-500">{member.roleDescription}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatLastActive(member.lastActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditMember(member)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{members.length} of {totalTeamSlots} team members used (Professional Plan)</span>
          </div>
        </div>
      </div>

      {/* Invite/Edit Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              aria-hidden="true"
              onClick={() => setInviteModalOpen(false)}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="hidden sm:block absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={() => setInviteModalOpen(false)}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    {editingMember ? 'Edit Team Member' : 'Invite Team Member'}
                  </h3>
                  <div className="mt-4">
                    {/* Form */}
                    <form onSubmit={editingMember ? editForm.handleSubmit : inviteForm.handleSubmit}>
                      {!editingMember && (
                        <div className="mb-4">
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <input
                            type="email"
                            name="email"
                            id="email"
                            className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                              inviteForm.touched.email && inviteForm.errors.email ? 'border-red-500' : ''
                            }`}
                            placeholder="colleague@example.com"
                            value={inviteForm.values.email}
                            onChange={inviteForm.handleChange}
                            onBlur={inviteForm.handleBlur}
                          />
                          {inviteForm.touched.email && inviteForm.errors.email && (
                            <p className="mt-1 text-sm text-red-600">{inviteForm.errors.email}</p>
                          )}
                        </div>
                      )}

                      <div className="mb-4">
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <select
                          id="role"
                          name="role"
                          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                            (editingMember ? editForm.touched.role && editForm.errors.role : 
                             inviteForm.touched.role && inviteForm.errors.role) ? 'border-red-500' : ''
                          }`}
                          value={editingMember ? editForm.values.role : inviteForm.values.role}
                          onChange={editingMember ? editForm.handleChange : inviteForm.handleChange}
                          onBlur={editingMember ? editForm.handleBlur : inviteForm.handleBlur}
                        >
                          <option value="Admin">Admin</option>
                          <option value="Editor">Editor</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                        {editingMember ? 
                          (editForm.touched.role && editForm.errors.role && (
                            <p className="mt-1 text-sm text-red-600">{editForm.errors.role}</p>
                          )) : 
                          (inviteForm.touched.role && inviteForm.errors.role && (
                            <p className="mt-1 text-sm text-red-600">{inviteForm.errors.role}</p>
                          ))
                        }
                      </div>

                      <div className="mt-6 space-y-2">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-gray-700">
                              <strong>Admin:</strong> Full access to all features and settings
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-gray-700">
                              <strong>Editor:</strong> Can edit content but not manage team or billing
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-gray-700">
                              <strong>Viewer:</strong> Read-only access to analytics and conversations
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                          disabled={loading}
                        >
                          {loading ? 
                            'Processing...' : 
                            editingMember ? 'Save Changes' : 'Send Invitation'
                          }
                        </button>
                        <button
                          type="button"
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                          onClick={() => setInviteModalOpen(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMembersSection;