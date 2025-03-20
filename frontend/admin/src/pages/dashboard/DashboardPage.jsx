import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { statsService } from '../../services/statsService';
import { format } from 'date-fns';

// Components
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Icons
import {
  UsersIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const data = await statsService.getDashboardStats();
        setDashboardData(data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Generate chart data
  const getChartData = () => {
    if (!dashboardData || !dashboardData.historical_data) return null;

    const labels = dashboardData.historical_data.map(item => 
      format(new Date(item.date), 'MMM d')
    );

    return {
      labels,
      datasets: [
        {
          label: 'Sessions',
          data: dashboardData.historical_data.map(item => item.total_sessions),
          borderColor: 'rgb(79, 70, 229)',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Messages',
          data: dashboardData.historical_data.map(item => item.total_messages),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Platform Usage (Last 30 Days)'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  if (isLoading) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Error</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to display change values with appropriate styling
  const displayChange = (value) => {
    const isPositive = value >= 0;
    return (
      <span
        className={classNames(
          isPositive ? 'text-green-600' : 'text-red-600',
          'inline-flex items-center'
        )}
      >
        {isPositive ? (
          <ArrowUpIcon className="h-4 w-4 mr-1" />
        ) : (
          <ArrowDownIcon className="h-4 w-4 mr-1" />
        )}
        {Math.abs(value)}%
      </span>
    );
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-900">Overview</h2>
          <p className="mt-1 text-sm text-gray-500">
            Platform statistics as of {format(new Date(dashboardData.last_updated), 'PPP')}
          </p>
        </div>

        {/* Stats cards */}
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Clients stats */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {dashboardData.clients.total}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link to="/clients" className="font-medium text-indigo-600 hover:text-indigo-500">
                  View all clients
                </Link>
              </div>
            </div>
          </div>

          {/* Active clients */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Clients</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {dashboardData.clients.active}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <div className="font-medium text-gray-500">
                  {((dashboardData.clients.active / dashboardData.clients.total) * 100).toFixed(1)}% active rate
                </div>
              </div>
            </div>
          </div>

          {/* Messages today */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Messages Today</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {dashboardData.usage.today.total_messages || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <div className="font-medium text-gray-500">
                  {displayChange(dashboardData.usage.changes.total_messages)} from yesterday
                </div>
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCardIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Monthly Revenue</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        ${dashboardData.revenue.total_month || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link to="/payments" className="font-medium text-indigo-600 hover:text-indigo-500">
                  View payment details
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg p-6">
            {getChartData() && (
              <Line 
                data={getChartData()} 
                options={chartOptions} 
                height={80} 
              />
            )}
          </div>
        </div>

        {/* Subscription breakdown */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Plan Distribution</h2>
          <div className="mt-4 bg-white shadow rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-500">Free</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">
                  {dashboardData.clients.by_plan.free || 0}
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  {((dashboardData.clients.by_plan.free || 0) / dashboardData.clients.total * 100).toFixed(1)}% of clients
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-blue-500">Basic</div>
                <div className="mt-2 text-3xl font-semibold text-blue-900">
                  {dashboardData.clients.by_plan.basic || 0}
                </div>
                <div className="mt-4 text-sm text-blue-500">
                  {((dashboardData.clients.by_plan.basic || 0) / dashboardData.clients.total * 100).toFixed(1)}% of clients
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-purple-500">Professional</div>
                <div className="mt-2 text-3xl font-semibold text-purple-900">
                  {dashboardData.clients.by_plan.professional || 0}
                </div>
                <div className="mt-4 text-sm text-purple-500">
                  {((dashboardData.clients.by_plan.professional || 0) / dashboardData.clients.total * 100).toFixed(1)}% of clients
                </div>
              </div>
              
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-indigo-500">Enterprise</div>
                <div className="mt-2 text-3xl font-semibold text-indigo-900">
                  {dashboardData.clients.by_plan.enterprise || 0}
                </div>
                <div className="mt-4 text-sm text-indigo-500">
                  {((dashboardData.clients.by_plan.enterprise || 0) / dashboardData.clients.total * 100).toFixed(1)}% of clients
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New clients */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">New Clients</h2>
            <Link
              to="/clients"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {dashboardData.clients.new_last_30_days} new clients in the last 30 days
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>
                  {((dashboardData.clients.new_last_30_days / dashboardData.clients.total) * 100).toFixed(1)}% 
                  {' '}growth rate in the last month.
                </p>
              </div>
              <div className="mt-5">
                <Link
                  to="/clients"
                  className="btn btn-primary"
                >
                  View all clients
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}