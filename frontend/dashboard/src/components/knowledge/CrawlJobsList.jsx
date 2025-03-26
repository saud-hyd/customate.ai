// frontend/dashboard/src/components/knowledge/CrawlJobsList.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

// Simplified component that doesn't rely on Chakra UI components
const CrawlJobsList = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState({});
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);

  // Basic styles for the component
  const styles = {
    container: {
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    headerTitle: {
      fontSize: '1.2rem',
      fontWeight: 'bold',
    },
    button: {
      padding: '8px 12px',
      backgroundColor: '#4299E1',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    dangerButton: {
      padding: '8px 12px',
      backgroundColor: '#E53E3E',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginRight: '8px',
    },
    successButton: {
      padding: '8px 12px',
      backgroundColor: '#48BB78',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginRight: '8px',
    },
    refreshButton: {
      padding: '8px 12px',
      backgroundColor: '#718096',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginRight: '8px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    th: {
      textAlign: 'left',
      padding: '12px 8px',
      borderBottom: '2px solid #E2E8F0',
      fontWeight: 'bold',
    },
    td: {
      padding: '12px 8px',
      borderBottom: '1px solid #E2E8F0',
    },
    statusBadge: (status) => ({
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: 
        status === 'completed' ? '#C6F6D5' : 
        status === 'in_progress' ? '#FEFCBF' : 
        status === 'pending' ? '#BEE3F8' :
        status === 'failed' ? '#FED7D7' : '#E2E8F0',
      color: 
        status === 'completed' ? '#22543D' : 
        status === 'in_progress' ? '#744210' : 
        status === 'pending' ? '#2A4365' :
        status === 'failed' ? '#822727' : '#1A202C',
    }),
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      marginTop: '20px',
    },
    paginationButton: {
      padding: '8px 12px',
      border: '1px solid #E2E8F0',
      margin: '0 4px',
      cursor: 'pointer',
    },
    alert: {
      padding: '12px',
      borderRadius: '4px',
      backgroundColor: '#FED7D7',
      color: '#822727',
      marginBottom: '20px',
    },
    spinner: {
      display: 'inline-block',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      border: '2px solid #E2E8F0',
      borderTopColor: '#3182CE',
      animation: 'spin 1s linear infinite',
    },
    link: {
      color: '#3182CE',
      textDecoration: 'none',
    },
    loadingContainer: {
      textAlign: 'center',
      padding: '40px',
    }
  };

  // Add the spinner animation
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * pageSize;
      const response = await api.get(`/api/knowledge/crawl?limit=${pageSize}&offset=${offset}&legacy_format=true`);
      
      // Handle the response data
      if (Array.isArray(response.data)) {
        setJobs(response.data);
        setTotalCount(response.data.length);
      } else if (response.data && Array.isArray(response.data.jobs)) {
        setJobs(response.data.jobs);
        setTotalCount(response.data.total || 0);
      } else {
        console.error('Unexpected response format:', response.data);
        setJobs([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching crawl jobs:', err);
      setError('Failed to load crawl jobs. Please try again.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  // Load jobs when component mounts or page changes
  useEffect(() => {
    fetchJobs();
  }, [page, pageSize]);

  const refreshJobStatus = async (jobId) => {
    try {
      setRefreshing(prev => ({ ...prev, [jobId]: true }));
      
      // Get detailed status
      const response = await api.get(`/api/knowledge/crawl/${jobId}?include_details=true`);
      
      // Update the job in the list
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.job_id === jobId ? { ...job, ...response.data } : job
        )
      );
      
      // Show notification
      alert(`Status updated: ${response.data.status}`);
    } catch (err) {
      console.error('Error refreshing job status:', err);
      alert(`Failed to update status: ${err.response?.data?.detail || 'An error occurred'}`);
    } finally {
      setRefreshing(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const cancelJob = async (jobId) => {
    const userConfirmed = window.confirm('Are you sure you want to cancel this job?');
    if (!userConfirmed) {
      return;
    }
    
    try {
      setRefreshing(prev => ({ ...prev, [jobId]: true }));
      
      await api.delete(`/api/knowledge/crawl/${jobId}`);
      
      alert('The crawl job has been cancelled');
      
      // Refresh the job list
      fetchJobs();
    } catch (err) {
      console.error('Error cancelling job:', err);
      alert(`Failed to cancel job: ${err.response?.data?.detail || 'An error occurred'}`);
    } finally {
      setRefreshing(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const retryJob = async (jobId) => {
    try {
      setRefreshing(prev => ({ ...prev, [jobId]: true }));
      
      await api.post(`/api/knowledge/crawl/${jobId}/retry`);
      
      alert('The crawl job has been queued for retry');
      
      // Refresh the job list
      fetchJobs();
    } catch (err) {
      console.error('Error retrying job:', err);
      alert(`Failed to retry job: ${err.response?.data?.detail || 'An error occurred'}`);
    } finally {
      setRefreshing(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (err) {
      return dateString;
    }
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
  };

  if (loading && jobs.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <div style={{ marginTop: '10px' }}>Loading crawl jobs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.alert}>
        <div style={{ fontWeight: 'bold' }}>Error loading crawl jobs</div>
        <div>{error}</div>
        <button style={styles.button} onClick={fetchJobs}>Retry</button>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div style={{...styles.container, border: '1px solid #E2E8F0', borderRadius: '4px'}}>
        <div style={{ marginBottom: '16px' }}>No crawl jobs found. Create a new job to start crawling a website.</div>
        <button style={styles.button}>Create New Job</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Web Crawler Jobs</div>
        <button 
          style={styles.button} 
          onClick={fetchJobs} 
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>URL</th>
              <th style={styles.th}>Pages</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Last Updated</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.job_id}>
                <td style={styles.td}>
                  <span style={styles.statusBadge(job.status)}>
                    {getStatusLabel(job.status)}
                  </span>
                </td>
                <td style={styles.td}>
                  <a 
                    href={job.base_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={styles.link}
                    title={job.base_url}
                  >
                    {job.base_url.length > 30 ? job.base_url.substring(0, 30) + '...' : job.base_url}
                  </a>
                </td>
                <td style={styles.td}>
                  <div>{job.pages_processed || 0} processed / {job.pages_crawled || 0} crawled</div>
                  {job.pages_failed > 0 && (
                    <div style={{ color: '#E53E3E', fontSize: '0.9em' }}>
                      {job.pages_failed} failed
                    </div>
                  )}
                </td>
                <td style={styles.td}>{formatDate(job.created_at)}</td>
                <td style={styles.td}>
                  {job.completed_at 
                    ? formatDate(job.completed_at) 
                    : (job.started_at ? formatDate(job.started_at) : 'Not started')}
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex' }}>
                    {/* Refresh button */}
                    <button
                      style={styles.refreshButton}
                      onClick={() => refreshJobStatus(job.job_id)}
                      disabled={refreshing[job.job_id]}
                      title="Refresh Status"
                    >
                      {refreshing[job.job_id] ? '...' : '↻'}
                    </button>
                    
                    {/* Cancel button (only for pending or in_progress) */}
                    {['pending', 'in_progress'].includes(job.status) && (
                      <button
                        style={styles.dangerButton}
                        onClick={() => cancelJob(job.job_id)}
                        disabled={refreshing[job.job_id]}
                        title="Cancel Job"
                      >
                        ✕
                      </button>
                    )}
                    
                    {/* Retry button (only for failed or cancelled) */}
                    {['failed', 'cancelled'].includes(job.status) && (
                      <button
                        style={styles.successButton}
                        onClick={() => retryJob(job.job_id)}
                        disabled={refreshing[job.job_id]}
                        title="Retry Job"
                      >
                        ▶
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalCount > pageSize && (
        <div style={styles.pagination}>
          <button 
            style={styles.paginationButton} 
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span style={{ padding: '8px 12px' }}>
            Page {page} of {Math.ceil(totalCount / pageSize)}
          </span>
          <button 
            style={styles.paginationButton} 
            onClick={() => handlePageChange(Math.min(Math.ceil(totalCount / pageSize), page + 1))}
            disabled={page >= Math.ceil(totalCount / pageSize)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default CrawlJobsList;