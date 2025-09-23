// src/pages/Student/Certificates.js
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Award, 
  Download, 
  Share2, 
  Eye,
  Search,
} from 'lucide-react';
import { certificateAPI } from '../../services/certificateAPI';
import CertificateCard from '../../components/Certificate/CertificateCard';
import CertificateViewer from '../../components/Certificate/CertificateViewer';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatters } from '../../utils/formatters';
import toast from 'react-hot-toast';

const Certificates = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  const { data: certificatesData, isLoading } = useQuery(
    'my-certificates',
    certificateAPI.getMyCertificates,
    {
      staleTime: 10 * 60 * 1000,
    }
  );

  const certificates = certificatesData?.data || [];

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.enrollment.internship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.enrollment.internship.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || cert.enrollment.internship.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(certificates.map(cert => cert.enrollment.internship.category))];

  const handleDownload = (certificateUrl) => {
    if (certificateUrl) {
      // Create a temporary link to download the certificate
      const link = document.createElement('a');
      link.href = certificateUrl;
      link.download = 'certificate.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Certificate downloaded!');
    } else {
      toast.error('Certificate not available for download');
    }
  };

  const handleView = (certificate) => {
    setSelectedCertificate(certificate);
    setShowViewer(true);
  };

  const handleShare = (certificate) => {
    if (navigator.share) {
      navigator.share({
        title: `Certificate - ${certificate.enrollment.internship.title}`,
        text: 'Check out my certificate!',
        url: certificate.certificateUrl
      }).then(() => {
        toast.success('Certificate shared!');
      }).catch(() => {
        // Fallback to copying URL
        copyToClipboard(certificate);
      });
    } else {
      copyToClipboard(certificate);
    }
  };

  const copyToClipboard = (certificate) => {
    navigator.clipboard.writeText(certificate.certificateUrl).then(() => {
      toast.success('Certificate URL copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy URL');
    });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Certificates</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Your achievements and certifications earned through completed courses
        </p>
      </div>

      {/* Stats */}
      {certificates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {certificates.length}
            </div>
            <div className="text-gray-600">Total Certificates</div>
          </Card>

          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {categories.length}
            </div>
            <div className="text-gray-600">Categories</div>
          </Card>

          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {certificates.filter(cert => 
                new Date(cert.issuedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              ).length}
            </div>
            <div className="text-gray-600">This Month</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      {certificates.length > 0 && (
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search certificates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="text-sm text-gray-500">
              {filteredCertificates.length} certificate{filteredCertificates.length !== 1 ? 's' : ''}
            </div>
          </div>
        </Card>
      )}

      {/* Certificates */}
      {filteredCertificates.length === 0 ? (
        <Card className="text-center py-12">
          <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || categoryFilter !== 'all' ? 'No certificates found' : 'No certificates yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || categoryFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Complete courses and earn certificates to showcase your achievements'
            }
          </p>
          {!searchTerm && categoryFilter === 'all' && (
            <Button onClick={() => window.location.href = '/courses'}>
              View My Courses
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((certificate) => (
            <CertificateCard
              key={certificate.id}
              certificate={certificate}
              onDownload={handleDownload}
              onView={handleView}
              onShare={handleShare}
            />
          ))}
        </div>
      )}

      {/* Featured Achievements */}
      {certificates.length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Achievements</h2>
            <div className="space-y-4">
              {certificates
                .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt))
                .slice(0, 3)
                .map((certificate) => (
                  <div key={certificate.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {certificate.enrollment.internship.title}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>Issued {formatters.relativeTime(certificate.issuedAt)}</span>
                        <Badge variant="primary" size="sm">
                          {certificate.enrollment.internship.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(certificate)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(certificate.certificateUrl)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShare(certificate)}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      )}

      {/* Tips */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Certificate Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <span>Certificates are blockchain-verified for authenticity</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <span>Download PDF copies for your records</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <span>Share certificates on LinkedIn and social media</span>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <span>Include certificate IDs in your resume</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Certificate Viewer Modal */}
      <CertificateViewer
        isOpen={showViewer}
        onClose={() => setShowViewer(false)}
        certificate={selectedCertificate}
      />
    </div>
  );
};

export default Certificates;