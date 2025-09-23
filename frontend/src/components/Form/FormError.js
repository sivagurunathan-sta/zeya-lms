import React from 'react';
import { AlertCircle } from 'lucide-react';

const FormError = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <div className={`flex items-center space-x-2 text-red-600 text-sm ${className}`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};

export default FormError;