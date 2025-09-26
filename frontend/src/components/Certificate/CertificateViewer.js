import React from 'react';
import { X, Download, Share2 } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';

const CertificateViewer = ({ isOpen, onClose, certificate }) => {
  const handleDownload = () => {
    if (certificate?.certificateUrl) {
      window.open(certificate.certificateUrl, '_blank');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Certificate - ${certificate?.enrollment?.internship?.title}`,
        text: 'Check out my certificate!',
        url: certificate?.certificateUrl
      });
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(certificate?.certificateUrl);
      alert('Certificate URL copied to clipboard!');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" showCloseButton={false}>
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Certificate Preview</h3>
          <div className="flex items-center space-x-2">
            <Button onClick={handleDownload} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleShare} variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Certificate Preview */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {certificate?.certificateUrl ? (
            <iframe
              src={certificate.certificateUrl}
              className="w-full h-96"
              title="Certificate Preview"
            />
          ) : (
            <div className="h-96 bg-gray-100 flex items-center justify-center">
              <p className="text-gray-500">Certificate preview not available</p>
            </div>
          )}
        </div>

        {/* Certificate Info */}
        <div className="mt-4 bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block">Course</span>
              <span className="font-medium">{certificate?.enrollment?.internship?.title}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Issued Date</span>
              <span className="font-medium">
                {certificate?.issuedAt && new Date(certificate.issuedAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Certificate ID</span>
              <span className="font-medium">{certificate?.id}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Status</span>
              <span className="font-medium text-green-600">Verified</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CertificateViewer;