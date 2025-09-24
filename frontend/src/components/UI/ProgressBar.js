import React from 'react';

const ProgressBar = ({ 
  progress, 
  size = 'md', 
  color = 'blue', 
  showPercentage = true,
  className = ''
}) => {
  const sizes = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colors = {
    blue: 'bg-gradient-to-r from-blue-500 to-blue-700',
    green: 'bg-gradient-to-r from-green-500 to-green-700',
    yellow: 'bg-gradient-to-r from-yellow-500 to-yellow-700',
    red: 'bg-gradient-to-r from-red-500 to-red-700',
    purple: 'bg-gradient-to-r from-purple-500 to-purple-700'
  };

  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizes[size]} overflow-hidden`}>
        <div 
          className={`${colors[color]} ${sizes[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
