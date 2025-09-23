import React, { useState } from 'react';
import { Download, FileText, Share2, Eye } from 'lucide-react';
import Button from '../UI/Button';
import Card from '../UI/Card';

const CertificateDownload = ({ enrollment, onGenerate, onDownload }) => {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate(enrollment.id);
    } finally {
      setGenerating(false);
    }
  };

  const canGenerateCertificate = 
    enrollment.progressPercentage === 100 && 
    enrollment.paymentStatus === 'COMPLETED';

  const hasCertificate = enrollment.certificateIssued;

  return (
    <Card className="text-center">
      <div className="p-8">
        {/* Icon */}
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-10 h-10 text-purple-600" />
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Certificate of Completion
        </h3>
        
        {hasCertificate ? (
          <div>
            <p className="text-gray-600 mb-6">
              Congratulations! Your certificate is ready for download.
            </p>
            <div className="space-y-3">
              <Button onClick={() => onDownload(enrollment.certificate?.certificateUrl)} className="w-full" size="lg">
                <Download className="w-5 h-5 mr-2" />
                Download Certificate
              </Button>
              <div className="flex space-x-3">
                <Button variant="outline" className="flex-1">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        ) : canGenerateCertificate ? (
          <div>
            <p className="text-gray-600 mb-6">
              You've completed all requirements! Generate your certificate now.
            </p>
            <Button 
              onClick={handleGenerate} 
              loading={generating}
              className="w-full" 
              size="lg"
            >
              <FileText className="w-5 h-5 mr-2" />
              Generate Certificate
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-6">
              Complete the following requirements to unlock your certificate:
            </p>
            <div className="space-y-3 text-left">
              <div className={`flex items-center space-x-3 ${
                enrollment.progressPercentage === 100 ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  enrollment.progressPercentage === 100 ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {enrollment.progressPercentage === 100 ? '✓' : '○'}
                </div>
                <span>Complete all course tasks ({enrollment.progressPercentage}%)</span>
              </div>
              <div className={`flex items-center space-x-3 ${
                enrollment.paymentStatus === 'COMPLETED' ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  enrollment.paymentStatus === 'COMPLETED' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {enrollment.paymentStatus === 'COMPLETED' ? '✓' : '○'}
                </div>
                <span>Complete payment verification</span>
              </div>
            </div>
          </div>
        )}

        {/* Certificate Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="block font-medium">Course</span>
              <span>{enrollment.internship.title}</span>
            </div>
            <div>
              <span className="block font-medium">Duration</span>
              <span>{enrollment.internship.duration} weeks</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CertificateDownload;