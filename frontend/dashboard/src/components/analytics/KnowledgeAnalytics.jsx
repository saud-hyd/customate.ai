// Path: frontend/dashboard/src/components/analytics/KnowledgeAnalytics.jsx
import React, { useState } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { DocumentSearchIcon, DocumentTextIcon, SearchIcon, CheckCircleIcon } from '@heroicons/react/outline';
import LoadingState from '../common/LoadingState';
import { formatNumber, formatPercentage } from '../../utils/formatters';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Knowledge Analytics Component
 * Shows detailed metrics about knowledge base usage
 */
const KnowledgeAnalytics = ({ data, dateRange }) => {
  const [selectedCollection, setSelectedCollection] = useState(null);
  
  if (!data) {
    return <LoadingState message="Loading knowledge base data..." />;
  }

  // Sample colors for collections
  const collectionColors = [
    'rgba(59, 130, 246, 0.7)', // blue
    'rgba(139, 92, 246, 0.7)',  // purple
    'rgba(16, 185, 129, 0.7)',  // green
    'rgba(245, 158, 11, 0.7)',  // amber
    'rgba(236, 72, 153, 0.7)',  // pink
    'rgba(6, 182, 212, 0.7)',   // cyan
    'rgba(248, 113, 113, 0.7)', // red
    'rgba(52, 211, 153, 0.7)',  // emerald
  ];

  // Prepare distribution chart data
  const distributionData = {
    labels: data.collection_distribution?.map(item => item.name) || [],
    datasets: [
      {
        data: data.collection_distribution?.map(item => item.search_count) || [],
        backgroundColor: collectionColors.slice(0, data.collection_distribution?.length || 0),
        borderWidth: 1,
      },
    ],
  };

  // Prepare daily usage chart data
  const dailyUsageData = {
    labels: data.time_series?.map(item => item.date) || [],
    datasets: [
      {
        label: 'Searches',
        data: data.time_series?.map(item => item.search_count) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Avg. Relevance',
        data: data.time_series?.map(item => item.average_relevance_score * 100) || [],
        yAxisID: 'y1',
        type: 'line',
        fill: false,
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  // Prepare relevance distribution data
  const relevanceData = {
    labels: ['0-0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '0.8-1.0'],
    datasets: [
      {
        label: 'Search Count',
        data: [5, 12, 25, 48, 65], // Example data - replace with actual if available
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Summary metrics cards
  const summaryMetrics = [
    {
      title: 'Total Searches',
      value: formatNumber(data.summary?.total_searches || 0),
      icon: SearchIcon,
      color: 'bg-blue-500',
      description: 'Total knowledge base queries',
    },
    {
      title: 'Avg. Relevance',
      value: formatPercentage((data.summary?.avg_relevance_score || 0) * 100, 1),
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      description: 'Average search relevance score',
    },
    {
      title: 'Knowledge Items',
      value: formatNumber(data.summary?.current_items || 0),
      icon: DocumentTextIcon,
      color: 'bg-purple-500',
      description: 'Total knowledge base items',
    },
    {
      title: 'Documents',
      value: formatNumber(data.summary?.current_documents || 0),
      icon: DocumentSearchIcon,
      color: 'bg-amber-500',
      description: 'Processed source documents',
    },
  ];
  
  // Handle collection selection
  const handleCollectionClick = (event, elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const collection = data.collection_distribution[index];
      setSelectedCollection(collection);
    }
  };
  
  return (
    <div className="space-y-8">
      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryMetrics.map((metric) => (
          <div 
            key={metric.title} 
            className="bg-white rounded-lg shadow overflow-hidden flex flex-col"
          >
            <div className="flex items-center p-5">
              <div className={`flex-shrink-0 rounded-md p-3 ${metric.color}`}>
                <metric.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{metric.title}</dt>
                  <dd>
                    <div className="text-lg font-bold text-gray-900">{metric.value}</div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 flex-1">
              <div className="text-sm text-gray-500">
                {metric.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collection distribution chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Knowledge Base Distribution</h3>
          <div className="h-80 flex items-center justify-center">
            <div className="w-full max-w-xs">
              <Pie
                data={distributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        boxWidth: 12,
                        padding: 15,
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.raw || 0;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${label}: ${value} searches (${percentage}%)`;
                        }
                      }
                    }
                  },
                  onClick: handleCollectionClick,
                }}
              />
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500 text-center">
            Click on a collection to see detailed metrics
          </p>
        </div>

        {/* Daily usage chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Usage & Relevance</h3>
          <div className="h-80">
            <Bar
              data={dailyUsageData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Search Count',
                    },
                  },
                  y1: {
                    beginAtZero: true,
                    max: 100,
                    position: 'right',
                    title: {
                      display: true,
                      text: 'Relevance (%)',
                    },
                    grid: {
                      drawOnChartArea: false,
                    },
                  },
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                          label += ': ';
                        }
                        if (context.dataset.label === 'Avg. Relevance') {
                          label += context.parsed.y.toFixed(1) + '%';
                        } else {
                          label += context.parsed.y;
                        }
                        return label;
                      }
                    }
                  }
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Collection detail section - shown when a collection is selected */}
      {selectedCollection && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Collection Details: {selectedCollection.name}
            </h3>
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedCollection(null)}
            >
              Close
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Total Searches</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {formatNumber(selectedCollection.search_count || 0)}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Avg. Relevance</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {formatPercentage((selectedCollection.avg_relevance || 0) * 100, 1)}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Item Count</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {formatNumber(selectedCollection.item_count || 0)}
              </div>
            </div>
          </div>
          
          <div className="h-60">
            <Bar
              data={{
                labels: ['Most Frequently Used Items'],
                datasets: [
                  {
                    label: 'Search Count',
                    data: [65, 59, 80, 81, 56, 55, 40].slice(0, 5), // Example data
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Relevance distribution chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Relevance Score Distribution</h3>
        <div className="h-64">
          <Bar
            data={relevanceData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                },
                x: {
                  title: {
                    display: true,
                    text: 'Relevance Score Range',
                  },
                },
              },
              plugins: {
                legend: {
                  display: false,
                },
                tooltip: {
                  callbacks: {
                    title: function(tooltipItems) {
                      return `Relevance Score: ${tooltipItems[0].label}`;
                    },
                  }
                }
              },
            }}
          />
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Distribution of searches by relevance score. Higher scores indicate better knowledge base matches.
        </p>
      </div>

      {/* Top searches table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Searches</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Query
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Relevance
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collection
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Example top search data - replace with actual data */}
              {[
                { query: "How do I reset my password?", count: 145, relevance: 0.92, collection: "FAQs" },
                { query: "Pricing plans", count: 98, relevance: 0.88, collection: "Pricing" },
                { query: "Return policy", count: 87, relevance: 0.95, collection: "Policies" },
                { query: "How to contact support", count: 76, relevance: 0.89, collection: "Support" },
                { query: "Account activation", count: 65, relevance: 0.85, collection: "Accounts" },
              ].map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{item.query}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{item.count}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{(item.relevance * 100).toFixed(1)}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {item.collection}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeAnalytics;