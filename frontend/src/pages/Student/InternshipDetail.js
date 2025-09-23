import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Users, Star, CheckCircle, ArrowLeft } from 'lucide-react';
import Button from '../../components/UI/Button';
import Badge from '../../components/UI/Badge';
import Card from '../../components/UI/Card';
import ProgressBar from '../../components/UI/ProgressBar';
import toast from 'react-hot-toast';
import { internshipAPI } from '../../services/internshipAPI';

const InternshipDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const fetchInternship = async () => {
      setLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockInternship = {
        id: '1',
        title: 'Full Stack Web Development',
        description: 'Master the art of full-stack web development with our comprehensive internship program. Learn modern technologies including React, Node.js, Express, and MongoDB while building real-world projects.',
        price: 4999,
        duration: 12,
        category: 'Programming',
        difficulty: 'INTERMEDIATE',
        enrolledCount: 45,
        maxStudents: 50,
        thumbnail: null,
        requirements: [
          'Basic understanding of HTML and CSS',
          'Familiarity with JavaScript fundamentals',
          'Computer with internet connection',
          'Willingness to learn and practice'
        ],
        outcomes: [
          'Build responsive web applications using React',
          'Develop RESTful APIs with Node.js and Express',
          'Work with databases using MongoDB',
          'Deploy applications to cloud platforms',
          'Understand modern development workflows',
          'Build a professional portfolio'
        ],
        tasks: [
          { id: '1', title: 'Environment Setup & Git Basics', order: 1 },
          { id: '2', title: 'HTML5 & CSS3 Fundamentals', order: 2 },
          { id: '3', title: 'JavaScript ES6+ Features', order: 3 },
          { id: '4', title: 'React Components & JSX', order: 4 },
          { id: '5', title: 'State Management with Redux', order: 5 },
          { id: '6', title: 'Node.js & Express Backend', order: 6 },
          { id: '7', title: 'MongoDB & Database Design', order: 7 },
          { id: '8', title: 'API Development & Testing', order: 8 },
          { id: '9', title: 'Authentication & Security', order: 9 },
          { id: '10', title: 'Deployment & Final Project', order: 10 }
        ]
      };

      setInternship(mockInternship);
      setLoading(false);
    };

    fetchInternship();
  }, [id]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await internshipAPI.enrollInternship(id);
      toast.success('Successfully enrolled! Welcome to the program!');
      navigate('/courses');
    } catch (error) {
      toast.error('Failed to enroll. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-200 animate-pulse rounded-lg h-32"></div>
            <div className="bg-gray-200 animate-pulse rounded-lg h-48"></div>
          </div>
          <div className="bg-gray-200 animate-pulse rounded-lg h-96"></div>
        </div>
      </div>
    );
  }

  if (!internship) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Internship not found</h2>
        <Button onClick={() => navigate('/internships')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Internships
        </Button>
      </div>
    );
  }

  const spotsLeft = internship.maxStudents - internship.enrolledCount;
  const isAlmostFull = spotsLeft <= 5;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate('/internships')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Internships
      </Button>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <Badge variant="primary" className="bg-white text-blue-600">
                {internship.category}
              </Badge>
              <Badge variant="success" className="bg-white text-green-600">
                {internship.difficulty}
              </Badge>
            </div>
            
            <h1 className="text-3xl font-bold mb-4">{internship.title}</h1>
            <p className="text-blue-100 text-lg leading-relaxed">
              {internship.description}
            </p>

            <div className="flex items-center space-x-6 mt-6">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>{internship.duration} weeks</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>{internship.enrolledCount}/{internship.maxStudents} enrolled</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 fill-yellow-400" />
                <span>4.8 (234 reviews)</span>
              </div>
            </div>
          </div>

          <div className="bg-white bg-opacity-10 rounded-lg p-6">
            <div className="text-center mb-6">
              <div className="text-3xl font-bold mb-2">₹{internship.price.toLocaleString()}</div>
              <p className="opacity-80">One-time payment</p>
            </div>

            {isAlmostFull && (
              <div className="bg-orange-100 text-orange-800 p-3 rounded-lg mb-4 text-sm">
                <strong>Only {spotsLeft} spots left!</strong>
              </div>
            )}

            <Button
              onClick={handleEnroll}
              loading={enrolling}
              className="w-full bg-white text-blue-600 hover:bg-gray-100"
              size="lg"
              disabled={spotsLeft === 0}
            >
              {spotsLeft === 0 ? 'Program Full' : 'Enroll Now'}
            </Button>

            <div className="mt-4 text-center text-sm opacity-80">
              <p>💳 Secure payment • 🎓 Certificate included</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Curriculum */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Course Curriculum
              </h2>
              <p className="text-gray-600 mb-6">
                {internship.tasks.length} comprehensive modules designed to take you from beginner to professional.
              </p>
              
              <div className="space-y-3">
                {internship.tasks.map((task, index) => (
                  <div key={task.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      {task.order}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                    </div>
                    <CheckCircle className="w-5 h-5 text-gray-300" />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Learning Outcomes */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                What You'll Learn
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {internship.outcomes.map((outcome, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{outcome}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requirements */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Prerequisites
              </h3>
              <ul className="space-y-2">
                {internship.requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700 text-sm">{requirement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Program Details */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Program Details
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">{internship.duration} weeks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Difficulty</span>
                  <Badge variant="primary">{internship.difficulty}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Certificate</span>
                  <span className="font-medium">Yes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Support</span>
                  <span className="font-medium">24/7</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Language</span>
                  <span className="font-medium">English</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Enrollment Progress */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Enrollment Progress
              </h3>
              <ProgressBar 
                progress={(internship.enrolledCount / internship.maxStudents) * 100}
                color="blue"
                className="mb-3"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{internship.enrolledCount} enrolled</span>
                <span>{spotsLeft} spots left</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InternshipDetail;
