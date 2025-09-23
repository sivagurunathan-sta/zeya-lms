import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Award,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { adminAPI } from '../../services/adminAPI';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import StatCard from '../../components/UI/StatCard';
import Chart from '../../components/Analytics/Chart';
import Button from '../../components/UI/Button';
import { formatters } from '../../utils/formatters';

const Analytics = () => {
  const [period, setPeriod] = useState('30');
  const [chartType, setChartType] = useState('line');

  const { data: analytics, isLoading } = useQuery(
    ['admin-analytics', period],
    () => adminAPI.getAnalytics(period),
    {
      staleTime: 5 * 60 * 1000,
      keepPreviousData: true,
    }
  );

  const { data: dashboard } = useQuery(
    'admin-dashboard',
    adminAPI.getDashboard,
    {
      staleTime: 2 * 60 * 1000,
    }
  );

  const exportData = () => {
    // Implement CSV export functionality
    console.log('Exporting analytics data...');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const { userGrowth = [], submissionTrends = [], revenueData = [] } = analytics || {};
  const { stats } = dashboard || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics & Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Detailed insights into your platform performance
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatters.currency(revenueData.reduce((sum, item) => sum + item.total, 0))}
          icon={DollarSign}
          color="green"
          trend="+12%"
        />
        <StatCard
          title="New Students"
          value={userGrowth.reduce((sum, item) => sum + item.count, 0)}
          icon={Users}
          color="blue"
          trend="+8%"
        />
        <StatCard
          title="Submissions"
          value={submissionTrends.reduce((sum, item) => sum + item.total, 0)}
          icon={TrendingUp}
          color="purple"
          trend="+15%"
        />
        <StatCard
          title="Certificates Issued"
          value={stats?.totalCertificates || 0}
          icon={Award}
          color="orange"
          trend="+5%"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Student Growth
            </h3>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
            </select>
          </div>
          
          <Chart
            type={chartType}
            data={{
              labels: userGrowth.map(item => 
                new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              ),
              datasets: [{
                label: 'New Students',
                data: userGrowth.map(item => item.count),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: chartType === 'bar' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: chartType === 'line'
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  display: false
                }
              }
            }}
          />
        </div>

        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Revenue Breakdown
          </h3>
          
          <Chart
            type="bar"
            data={{
              labels: revenueData.map(item => 
                new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              ),
              datasets: [
                {
                  label: 'Certificates',
                  data: revenueData.map(item => item.certificate),
                  backgroundColor: 'rgba(34, 197, 94, 0.8)',
                  borderColor: 'rgb(34, 197, 94)',
                  borderWidth: 1
                },
                {
                  label: 'Paid Tasks',
                  data: revenueData.map(item => item.paidTask),
                  backgroundColor: 'rgba(168, 85, 247, 0.8)',
                  borderColor: 'rgb(168, 85, 247)',
                  borderWidth: 1
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top'
                }
              },
              scales: {
                x: {
                  stacked: true
                },
                y: {
                  stacked: true,
                  beginAtZero: true
                }
              }
            }}
          />
        </div>

        {/* Submission Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Submission Trends
          </h3>
          
          <Chart
            type="line"
            data={{
              labels: submissionTrends.map(item => 
                new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              ),
              datasets: [
                {
                  label: 'Total Submissions',
                  data: submissionTrends.map(item => item.total),
                  borderColor: 'rgb(99, 102, 241)',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  tension: 0.4
                },
                {
                  label: 'On Time',
                  data: submissionTrends.map(item => item.onTime),
                  borderColor: 'rgb(34, 197, 94)',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  tension: 0.4
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top'
                }
              }
            }}
          />
        </div>

        {/* Performance Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Performance Overview
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Average Score</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {submissionTrends.length > 0 ? 
                  Math.round(submissionTrends.reduce((sum, item) => sum + item.avgScore, 0) / submissionTrends.length) : 0
                }%
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {submissionTrends.length > 0 ? 
                  Math.round((submissionTrends.reduce((sum, item) => sum + item.onTime, 0) / 
                  submissionTrends.reduce((sum, item) => sum + item.total, 0)) * 100) : 0
                }%
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Certificate Eligibility</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round((stats?.totalCertificates || 0) / (stats?.totalUsers || 1) * 100)}%
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Revenue per Student</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                ₹{Math.round((stats?.totalRevenue || 0) / (stats?.totalUsers || 1))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Days */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Performing Days
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {submissionTrends
                .sort((a, b) => b.avgScore - a.avgScore)
                .slice(0, 5)
                .map((item, index) => (
                  <div key={item.date} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {Math.round(item.avgScore)}%
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.total} submissions
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Revenue by Source */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Revenue by Source
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-900 dark:text-white">Certificates</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    ₹{revenueData.reduce((sum, item) => sum + item.certificate, 0).toLocaleString()}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.round((revenueData.reduce((sum, item) => sum + item.certificate, 0) / 
                    revenueData.reduce((sum, item) => sum + item.total, 0)) * 100)}%
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-900 dark:text-white">Paid Tasks</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    ₹{revenueData.reduce((sum, item) => sum + item.paidTask, 0).toLocaleString()}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.round((revenueData.reduce((sum, item) => sum + item.paidTask, 0) / 
                    revenueData.reduce((sum, item) => sum + item.total, 0)) * 100)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
