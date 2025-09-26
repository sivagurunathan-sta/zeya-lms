// src/pages/Student/PaymentPage.js
import React, { useState} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { 
  ArrowLeft, 
  Shield, 
  CheckCircle,
  Award,
} from 'lucide-react';
import { paymentAPI } from '../../services/paymentAPI';
import { internshipAPI } from '../../services/internshipAPI';
import PaymentForm from '../../components/Payment/PaymentForm';
import PaymentSuccess from '../../components/Payment/PaymentSuccess';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatters } from '../../utils/formatters';
import toast from 'react-hot-toast';

const PaymentPage = () => {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const [paymentStep, setPaymentStep] = useState('payment'); // payment, processing, success
  const [paymentDetails, setPaymentDetails] = useState(null);

  // Get enrollment details
  const { data: enrollmentData, isLoading } = useQuery(
    ['enrollment', enrollmentId],
    () => internshipAPI.getEnrollmentById(enrollmentId),
    {
      enabled: !!enrollmentId,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Create payment order
  const createOrderMutation = useMutation(
    paymentAPI.createPaymentOrder,
    {
      onSuccess: (data) => {
        initializeRazorpay(data.data);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create payment order');
      },
    }
  );

  // Verify payment
  const verifyPaymentMutation = useMutation(
    paymentAPI.verifyPayment,
    {
      onSuccess: (data) => {
        setPaymentDetails(data.data);
        setPaymentStep('success');
        toast.success('Payment successful! 🎉');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Payment verification failed');
        setPaymentStep('payment');
      },
    }
  );

  const enrollment = enrollmentData?.data;

  const initializeRazorpay = (orderData) => {
    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Student LMS',
      description: `Certificate for ${enrollment?.internship?.title}`,
      order_id: orderData.id,
      handler: function (response) {
        setPaymentStep('processing');
        verifyPaymentMutation.mutate({
          enrollmentId,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        });
      },
      prefill: {
        name: `${enrollment?.student?.firstName} ${enrollment?.student?.lastName}`,
        email: enrollment?.student?.email,
        contact: enrollment?.student?.phone || ''
      },
      theme: {
        color: '#6366f1'
      },
      modal: {
        ondismiss: function() {
          toast.error('Payment cancelled');
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const manualMutation = useMutation(
    ({ enrollmentId, proof }) => paymentAPI.createManualUPIPayment({ itemId: enrollmentId, amount: 499, type: 'certificate', proof }),
    {
      onSuccess: (data) => {
        setPaymentDetails(data.data?.data?.payment);
        setPaymentStep('processing');
        toast.success('Payment submitted. Awaiting admin approval.');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to submit payment');
        setPaymentStep('payment');
      },
    }
  );

  const handlePayment = (enrollmentId, paymentMethod, proof) => {
    if (paymentMethod === 'upi' && !window.Razorpay) {
      setPaymentStep('processing');
      manualMutation.mutate({ enrollmentId, proof });
      return;
    }
    setPaymentStep('processing');
    createOrderMutation.mutate(enrollmentId);
  };

  const handleDownloadReceipt = () => {
    // Implement receipt download
    toast.info('Receipt download functionality coming soon!');
  };

  const handleContinueLearning = () => {
    navigate('/courses');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!enrollment) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Enrollment not found</div>
        <Button onClick={() => navigate('/courses')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>
      </div>
    );
  }

  // Check if payment is already completed
  if (enrollment.paymentStatus === 'COMPLETED') {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card className="text-center p-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Already Completed</h2>
          <p className="text-gray-600 mb-6">
            You have already paid for this certificate. It will be processed shortly.
          </p>
          <Button onClick={() => navigate('/courses')} className="w-full">
            Go to Courses
          </Button>
        </Card>
      </div>
    );
  }

  // Check if course is not completed
  if (enrollment.progressPercentage < 100) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card className="text-center p-8">
          <Award className="w-16 h-16 text-orange-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Complete Course First</h2>
          <p className="text-gray-600 mb-6">
            You need to complete all course tasks before you can purchase a certificate.
          </p>
          <div className="mb-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${enrollment.progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {Math.round(enrollment.progressPercentage)}% complete
            </p>
          </div>
          <Button 
            onClick={() => navigate(`/courses/${enrollmentId}/tasks`)} 
            className="w-full"
          >
            Continue Course
          </Button>
        </Card>
      </div>
    );
  }

  if (paymentStep === 'success') {
    return (
      <PaymentSuccess
        paymentDetails={paymentDetails}
        onDownloadReceipt={handleDownloadReceipt}
        onContinueLearning={handleContinueLearning}
      />
    );
  }

  if (paymentStep === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-8">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h2>
          <p className="text-gray-600">Please wait while we verify your payment...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/courses')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Get Your Certificate
            </h1>
            <p className="text-gray-600">
              Complete your payment to receive your verified certificate
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Form */}
          <div>
            <PaymentForm
              enrollment={enrollment}
              onPayment={handlePayment}
              loading={createOrderMutation.isLoading}
            />
          </div>

          {/* Order Summary & Benefits */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        Certificate of Completion
                      </h4>
                      <p className="text-gray-600 text-sm">
                        {enrollment.internship.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="primary" size="sm">
                          {enrollment.internship.category}
                        </Badge>
                        <Badge variant="success" size="sm">
                          Verified
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total</span>
                      <span className="text-blue-600">
                        ₹{formatters.currency(499, false)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Includes all taxes
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Certificate Benefits */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Certificate Benefits
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Blockchain Verified</div>
                      <div className="text-sm text-gray-600">
                        Tamper-proof verification technology
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Shareable Link</div>
                      <div className="text-sm text-gray-600">
                        Share on LinkedIn, resume, and social media
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">PDF Download</div>
                      <div className="text-sm text-gray-600">
                        High-quality PDF for printing and records
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Lifetime Access</div>
                      <div className="text-sm text-gray-600">
                        Never expires, always accessible
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Security Info */}
            <Card>
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Secure Payment
                  </h3>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>PCI DSS compliant</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Powered by Razorpay</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>No card details stored</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Support */}
            <Card className="bg-blue-50 border-blue-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Need Help?
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Our support team is here to help you with any payment issues.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Contact Support
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
