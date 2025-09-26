import React, { useState } from 'react';
import { CreditCard, Smartphone, Building } from 'lucide-react';
import Button from '../UI/Button';
import Card from '../UI/Card';

const PaymentForm = ({ enrollment, onPayment, loading }) => {
  const [selectedMethod, setSelectedMethod] = useState('upi');

  const paymentMethods = [
    {
      id: 'upi',
      name: 'UPI Payment',
      description: 'Google Pay, PhonePe, Paytm, BHIM',
      icon: Smartphone,
      popular: true
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Visa, Mastercard, RuPay',
      icon: CreditCard
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      description: 'All major banks supported',
      icon: Building
    }
  ];

  const handlePayment = () => {
    onPayment(enrollment.id, selectedMethod);
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Complete Payment</h2>
          <p className="opacity-90">Secure payment to unlock your certificate</p>
        </div>

        <div className="p-6">
          {/* Course Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              {enrollment.internship.title}
            </h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Course Fee</span>
              <span className="text-3xl font-bold text-blue-600">
                ₹{enrollment.paymentAmount?.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-900">Payment Method</h3>
            
            {paymentMethods.map((method) => {
              const IconComponent = method.icon;
              const isSelected = selectedMethod === method.id;
              
              return (
                <label
                  key={method.id}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={method.id}
                    checked={isSelected}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <IconComponent className={`w-5 h-5 ${
                        isSelected ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {method.name}
                        </span>
                        {method.popular && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                  </div>
                  <div className={`w-4 h-4 border-2 rounded-full ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {/* Pay Button */}
          <Button
            onClick={handlePayment}
            loading={loading}
            className="w-full py-4 text-lg font-semibold"
            size="lg"
          >
            Pay ₹{enrollment.paymentAmount?.toLocaleString()}
          </Button>

          {/* Security Info */}
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>256-bit SSL encrypted payment</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Powered by Razorpay • 100% secure
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaymentForm;