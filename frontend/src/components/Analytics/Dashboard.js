import React from 'react';
import { Users, BookOpen, DollarSign, Award, TrendingUp } from 'lucide-react';
import StatsCard from './StatsCard';
import Chart from './Chart';
import Card from '../UI/Card';

const AnalyticsDashboard = ({ data }) => {
  const {
    totalStudents = 0,
    activeInternships = 0,
    monthlyRevenue = 0,
    certificatesIssued = 0,
    revenueData = [],
    enrollmentData = [],
    categoryData = []
  } = data;

  const stats = [
    {
      title: 'Total Students',
      value: totalStudents.toLocaleString(),
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Active Internships',
      value: activeInternships,
      change: '+5%',
      changeType: 'positive',
      icon: BookOpen,
      color: 'green'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${monthlyRevenue.toLocaleString()}`,
      change: '+18%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'purple'
    },
    {
      title: 'Certificates Issued',
      value: certificatesIssued.toLocaleString(),
      change: '+23%',
      changeType: 'positive',
      icon: Award,
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            <Chart
              type="area"
              data={revenueData}
              xAxisKey="month"
              yAxisKey="revenue"
              height={250}
              colors={['#3B82F6']}
            />
          </div>
        </Card>

        {/* Enrollment Chart */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">New Enrollments</h3>
            <Chart
              type="bar"
              data={enrollmentData}
              xAxisKey="month"
              yAxisKey="enrollments"
              height={250}
              colors={['#10B981']}
            />
          </div>
        </Card>
      </div>

      {/* Category Distribution */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Categories</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Chart
              type="pie"
              data={categoryData}
              yAxisKey="students"
              height={300}
              colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']}
            />
            <div className="space-y-4">
              {categoryData.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index] }}
                    ></div>
                    <span className="text-gray-700">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{category.students}</div>
                    <div className="text-sm text-gray-500">students</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;