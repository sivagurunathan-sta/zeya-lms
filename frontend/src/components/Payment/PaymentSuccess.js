import React from 'react';
import { CheckCircle, Download, ArrowRight } from 'lucide-react';
import Confetti from 'react-confetti';
import Button from '../UI/Button';
import Card from '../UI/Card';

const PaymentSuccess = ({ 
  paymentDetails, 
  onDownloadReceipt,
  onContinueLearning 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Confetti
        width={window.innerWidth}
        height={window.innerHeight}
        recycle={false}
        numberOfPieces={200}
      />
      
      <Card className="max-w-md w-full text-center">
        <div className="p-8">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600">
              Your payment has been processed successfully
            </p>
          </div>

          {/* Payment Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">Payment Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Course:</span>
                <span className="font-medium">{paymentDetails?.courseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">₹{paymentDetails?.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment ID:</span>
                <span className="font-medium text-xs">{paymentDetails?.paymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={onContinueLearning}
              className="w-full"
              size="lg"
            >
              Continue Learning
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button
              onClick={onDownloadReceipt}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Receipt
            </Button>
          </div>

          {/* What's Next */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">What's Next?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Access all course materials</li>
              <li>✓ Start with your first task</li>
              <li>✓ Earn your certificate upon completion</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaymentSuccess;