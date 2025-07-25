// Path: frontend/dashboard/src/hooks/useDashboard.js
// Usage: Custom hook for managing dashboard data, state, and real-time updates

import { useState, useEffect, useCallback, useRef } from 'react';
import analyticsService from '../services/analyticsService';
import subscriptionService from '../services/subscriptionService';

/**
 * Custom hook for dashboard data management
 * Provides loading states, error handling, and automatic refresh capabilities
 */
const useDashboard = (options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000, // 5 minutes
    enableRealTime = false,
    onError = null,
    onDataUpdate = null
  } = options;

  // State management
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: null,
    lastRefresh: null,
    data: {
      overview: null,
      metrics: null,
      subscription: null,
      performance: null
    }
  });

  // Refs for cleanup and interval management
  const refreshIntervalRef = useRef(null);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  /**
   * Safe state update that checks if component is still mounted
   */
  const safeSetState = useCallback((updater) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  /**
   * Fetch all dashboard data
   */
  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (forceRefresh) {
        safeSetState(prev => ({ ...prev, refreshing: true, error: null }));
      } else {
        safeSetState(prev => ({ ...prev, loading: true, error: null }));
      }

      // Fetch data in parallel with timeout
      const fetchPromises = Promise.allSettled([
        Promise.race([
          analyticsService.getDashboardOverview(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Dashboard overview timeout')), 10000)
          )
        ]),
        Promise.race([
          analyticsService.getChatPerformance({ days: 30 }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Chat performance timeout')), 10000)
          )
        ]),
        Promise.race([
          subscriptionService.getCurrentSubscription(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Subscription data timeout')), 10000)
          )
        ])
      ]);

      const results = await fetchPromises;
      
      // Process results
      const [overviewResult, performanceResult, subscriptionResult] = results;
      
      const newData = {
        overview: overviewResult.status === 'fulfilled' ? overviewResult.value : null,
        performance: performanceResult.status === 'fulfilled' ? performanceResult.value : null,
        subscription: subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null,
        metrics: null // Will be calculated from overview
      };

      // Calculate derived metrics
      if (newData.overview) {
        newData.metrics = calculateDerivedMetrics(newData.overview, newData.performance);
      }

      // Check for errors
      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => result.reason.message);

      if (errors.length === results.length) {
        throw new Error(`All data sources failed: ${errors.join(', ')}`);
      }

      safeSetState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: errors.length > 0 ? `Partial failure: ${errors.join(', ')}` : null,
        lastRefresh: new Date(),
        data: newData
      }));

      // Trigger callback
      if (onDataUpdate) {
        onDataUpdate(newData);
      }

      return newData;

    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      
      const errorMessage = error.name === 'AbortError' ? 
        'Request cancelled' : 
        `Failed to load dashboard data: ${error.message}`;

      safeSetState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: errorMessage
      }));

      if (onError) {
        onError(error);
      }

      throw error;
    }
  }, [safeSetState, onError, onDataUpdate]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    try {
      await analyticsService.refreshAllData(false);
      return await fetchDashboardData(true);
    } catch (error) {
      console.error('Manual refresh failed:', error);
      throw error;
    }
  }, [fetchDashboardData]);

  /**
   * Calculate derived metrics from raw data
   */
  const calculateDerivedMetrics = useCallback((overview, performance) => {
    if (!overview || !overview.today) return null;

    const today = overview.today;
    const monthly = overview.monthly || {};
    const changes = overview.changes || {};

    return {
      // Key metrics
      todayMessages: today.messages || 0,
      todaySessions: today.sessions || 0,
      todayUsers: today.users || 0,
      
      // Monthly totals
      monthlyMessages: monthly.total_messages || 0,
      monthlySessions: monthly.total_sessions || 0,
      monthlyUsers: monthly.total_users || 0,
      
      // Performance indicators
      avgResponseTime: performance?.summary?.avg_response_time_ms || 0,
      knowledgeUsage: performance?.summary?.knowledge_usage_percentage || 0,
      messagesPerSession: performance?.summary?.messages_per_session || 0,
      
      // Growth rates
      messageGrowth: changes.messages || 0,
      sessionGrowth: changes.sessions || 0,
      userGrowth: changes.users || 0,
      
      // Health scores (calculated)
      responseTimeScore: calculateResponseTimeScore(performance?.summary?.avg_response_time_ms),
      knowledgeScore: calculateKnowledgeScore(performance?.summary?.knowledge_usage_percentage),
      engagementScore: calculateEngagementScore(performance?.summary?.messages_per_session)
    };
  }, []);

  /**
   * Setup auto-refresh if enabled
   */
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (!state.refreshing && !state.loading) {
          fetchDashboardData(true);
        }
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchDashboardData, state.refreshing, state.loading]);

  /**
   * Initial data fetch
   */
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Get usage status for subscription metrics
   */
  const getUsageStatus = useCallback((percentage) => {
    if (percentage >= 90) return { level: 'critical', color: 'red' };
    if (percentage >= 80) return { level: 'warning', color: 'orange' };
    if (percentage >= 60) return { level: 'moderate', color: 'yellow' };
    return { level: 'normal', color: 'green' };
  }, []);

  /**
   * Check if data is stale and needs refresh
   */
  const isDataStale = useCallback(() => {
    if (!state.lastRefresh) return true;
    const staleThreshold = 10 * 60 * 1000; // 10 minutes
    return (Date.now() - state.lastRefresh.getTime()) > staleThreshold;
  }, [state.lastRefresh]);

  // Return hook interface
  return {
    // Data
    data: state.data,
    metrics: state.data.metrics,
    overview: state.data.overview,
    performance: state.data.performance,
    subscription: state.data.subscription,
    
    // State
    loading: state.loading,
    refreshing: state.refreshing,
    error: state.error,
    lastRefresh: state.lastRefresh,
    
    // Actions
    refresh,
    fetchData: fetchDashboardData,
    
    // Utilities
    getUsageStatus,
    isDataStale: isDataStale(),
    
    // Status indicators
    hasData: !!state.data.overview,
    hasError: !!state.error,
    isLoading: state.loading || state.refreshing
  };
};

// Helper functions for calculating scores
const calculateResponseTimeScore = (avgResponseTime) => {
  if (!avgResponseTime) return 100;
  
  // Score based on response time (lower is better)
  if (avgResponseTime <= 500) return 100;
  if (avgResponseTime <= 1000) return 80;
  if (avgResponseTime <= 2000) return 60;
  if (avgResponseTime <= 5000) return 40;
  return 20;
};

const calculateKnowledgeScore = (knowledgeUsage) => {
  if (!knowledgeUsage) return 0;
  
  // Score based on knowledge base utilization
  return Math.min(100, knowledgeUsage);
};

const calculateEngagementScore = (messagesPerSession) => {
  if (!messagesPerSession) return 0;
  
  // Score based on conversation depth
  if (messagesPerSession >= 5) return 100;
  if (messagesPerSession >= 3) return 80;
  if (messagesPerSession >= 2) return 60;
  if (messagesPerSession >= 1) return 40;
  return 20;
};

export default useDashboard;