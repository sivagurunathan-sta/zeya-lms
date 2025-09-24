import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  padding = 'md',
  shadow = 'sm',
  hover = false,
  ...props 
}) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const shadows = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  const hoverEffect = hover ? 'hover:shadow-md transition-shadow duration-200' : '';

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 ${shadows[shadow]} ${paddings[padding]} ${hoverEffect} card-hover animate-fade-in ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
