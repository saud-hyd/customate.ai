import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clientService } from '../../services/clientService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Icons
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 50
  });

  // Fetch clients with current filters
  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const data = await clientService.getClients({
        skip: pagination.skip,
        limit: pagination.limit,
        search: search || undefined,
        status: statusFilter || undefined,
        plan_type: planFilter || undefined
      });
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [pagination.skip, pagination.limit]);

  // Handle filter changes
  const handleFilter = () => {
    // Reset pagination when applying new filters
    setPagination({ ...pagination, skip: 0 });
    fetchClients();
  };

  // Determine badge color based on plan type
  const getPlanBadgeClass = (planType) => {
    switch (planType) {
      case 'free':
        return 'bg-gray-100 text-gray-800';
      case 'basic':
        return 'bg-blue-100 text-blue-800';
      case 'professional':
        return 'bg-purple-100 text-purple-800';
      case 'enterprise':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mt-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Search */}
            <div className="md:flex-1 max-w-lg">
              <label htmlFor="search" className="sr-only">
                Search clients
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="search"
                  name="search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Search by name, email, or ID"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleFilter()}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
              {/* Status Filter */}
              <div>
                <select
                  id="status"
                  name="status"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Plan Filter */}
              <div>
                <select
                  id="plan"
                  name="plan"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                >
                  <option value="">All Plans</option>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {/* Apply Filter Button */}
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={handleFilter}
              >
                <FunnelIcon className="mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Client list */}
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : clients.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                        >
                          Client
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Industry
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Plan
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Created
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Usage
                        </th>
                        <th
                          scope="col"
                          className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                        >
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {clients.map((client) => (
                        <tr key={client.client_id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">
                                {client.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="font-medium text-gray-900">{client.name}</div>
                                <div className="text-gray-500">{client.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {client.industry}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {client.active ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircleIcon className="mr-1 h-4 w-4" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <XCircleIcon className="mr-1 h-4 w-4" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeClass(client.plan_type)}`}>
                              {client.plan_type.charAt(0).toUpperCase() + client.plan_type.slice(1)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {format(new Date(client.created_at), 'MMM d, yyyy')}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {client.usage ? (
                              <div className="flex flex-col">
                                <div className="text-xs text-gray-500">
                                  Messages: {client.usage.messages_used || 0} / {client.usage.messages_limit || 0}
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                                  <div 
                                    className={`h-2.5 rounded-full ${
                                      (client.usage.messages_used / client.usage.messages_limit) > 0.8
                                        ? 'bg-red-500'
                                        : 'bg-indigo-500'
                                    }`}
                                    style={{ width: `${Math.min(100, client.usage.messages_used / client.usage.messages_limit * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <span>No data</span>
                            )}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              to={`/clients/${client.client_id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View<span className="sr-only">, {client.name}</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64">
                    <p className="text-gray-500">No clients found.</p>
                    <button
                      onClick={() => {
                        setSearch('');
                        setStatusFilter('');
                        setPlanFilter('');
                        fetchClients();
                      }}
                      className="mt-4 btn btn-secondary"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pagination */}
        {clients.length > 0 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 mt-4 rounded-md">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setPagination({
                  ...pagination,
                  skip: Math.max(0, pagination.skip - pagination.limit)
                })}
                disabled={pagination.skip === 0}
                className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${
                  pagination.skip === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({
                  ...pagination,
                  skip: pagination.skip + pagination.limit
                })}
                disabled={clients.length < pagination.limit}
                className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 ${
                  clients.length < pagination.limit ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{pagination.skip + 1}</span> to{' '}
                  <span className="font-medium">{pagination.skip + clients.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setPagination({
                      ...pagination,
                      skip: Math.max(0, pagination.skip - pagination.limit)
                    })}
                    disabled={pagination.skip === 0}
                    className={`relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 ${
                      pagination.skip === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronDownIcon className="h-5 w-5 rotate-90" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setPagination({
                      ...pagination,
                      skip: pagination.skip + pagination.limit
                    })}
                    disabled={clients.length < pagination.limit}
                    className={`relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 ${
                      clients.length < pagination.limit ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <ChevronDownIcon className="h-5 w-5 -rotate-90" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}