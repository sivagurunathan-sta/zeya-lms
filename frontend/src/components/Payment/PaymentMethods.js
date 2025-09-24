import React from 'react';
import { CreditCard, Smartphone, Building, Wallet } from 'lucide-react';

const PaymentMethods = ({ selectedMethod, onMethodSelect }) => {
  const methods = [
    {
      id: 'upi',
      name: 'UPI',
      description: 'Pay using Google Pay, PhonePe, Paytm',
      icon: Smartphone,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'card',
      name: 'Cards',
      description: 'Credit & Debit cards',
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      description: 'All major banks',
      icon: Building,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      id: 'wallet',
      name: 'Wallets',
      description: 'Paytm, Mobikwik, Airtel Money',
      icon: Wallet,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {methods.map((method) => {
        const IconComponent = method.icon;
        const isSelected = selectedMethod === method.id;
        
        return (
          <button
            key={method.id}
            onClick={() => onMethodSelect(method.id)}
            className={`p-4 rounded-lg border-2 transition-colors text-left ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`inline-flex p-2 rounded-lg mb-3 ${method.bgColor}`}>
              <IconComponent className={`w-5 h-5 ${method.color}`} />
            </div>
            <h3 className="font-medium text-gray-900">{method.name}</h3>
            <p className="text-sm text-gray-600">{method.description}</p>
          </button>
        );
      })}
    </div>
  );
};

export default PaymentMethods;