import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from '../UI/Card';

const StatsCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'positive',
  icon: Icon,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-500',
      text: 'text-blue-600',
      lightBg: 'bg-blue-50'
    },
    green: {
      bg: 'bg-green-500',
      text: 'text-green-600',
      lightBg: 'bg-green-50'
    },
    purple: {
      bg: 'bg-purple-500',
      text: 'text-purple-600',
      lightBg: 'bg-purple-50'
    },
    orange: {
      bg: 'bg-orange-500',
      text: 'text-orange-600',
      lightBg: 'bg-orange-50'
    },
    red: {
      bg: 'bg-red-500',
      text: 'text-red-600',
      lightBg: 'bg-red-50'
    }
  };

  const colors = colorClasses[color];
  const isPositive = changeType === 'positive';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendIcon className="w-4 h-4 mr-1" />
              <span>{change}</span>
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={`p-3 rounded-lg ${colors.lightBg}`}>
            <Icon className={`w-6 h-6 ${colors.text}`} />
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatsCard;