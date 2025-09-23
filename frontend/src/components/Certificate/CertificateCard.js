import React from 'react';
import { Download, Eye, Share2, Award } from 'lucide-react';
import Button from '../UI/Button';
import Badge from '../UI/Badge';

const CertificateCard = ({ certificate, onDownload, onView, onShare }) => {
  const {
    id,
    certificateUrl,
    issuedAt,
    enrollment: { internship }
  } = certificate;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Certificate of Completion</h3>
            <Badge variant="success" className="mt-1">Verified</Badge>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Course Info */}
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-1">
            {internship.title}
          </h4>
          <p className="text-gray-600">{internship.category}</p>
        </div>

        {/* Issue Info */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block">Issued Date</span>
              <span className="font-medium">
                {new Date(issuedAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Certificate ID</span>
              <span className="font-medium text-xs">{id.slice(-8)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            onClick={() => onView(certificate)}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          
          <Button
            onClick={() => onDownload(certificateUrl)}
            className="flex-1"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          
          <Button
            onClick={() => onShare(certificate)}
            variant="outline"
            size="sm"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Verification */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Blockchain verified certificate</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateCard;