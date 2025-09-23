import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import InternshipFilter from '../../components/Internship/InternshipFilter';
import InternshipGrid from '../../components/Internship/InternshipGrid';
import Pagination from '../../components/UI/Pagination';
import { internshipAPI } from '../../services/internshipAPI';

const Internships = () => {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Mock data - replace with real API calls
  useEffect(() => {
    const fetchInternships = async () => {
      setLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockInternships = [
        {
          id: '1',
          title: 'Full Stack Web Development',
          description: 'Learn MERN stack development with real-world projects and mentorship',
          price: 4999,
          duration: 12,
          category: 'Programming',
          difficulty: 'INTERMEDIATE',
          enrolledCount: 45,
          maxStudents: 50,
          thumbnail: null
        },
        {
          id: '2',
          title: 'Digital Marketing Strategy',
          description: 'Master modern digital marketing techniques and grow your brand',
          price: 3499,
          duration: 8,
          category: 'Marketing',
          difficulty: 'BEGINNER',
          enrolledCount: 32,
          maxStudents: 40,
          thumbnail: null
        },
        {
          id: '3',
          title: 'UI/UX Design Mastery',
          description: 'Create stunning user experiences with design thinking principles',
          price: 5999,
          duration: 10,
          category: 'Design',
          difficulty: 'INTERMEDIATE',
          enrolledCount: 28,
          maxStudents: 35,
          thumbnail: null
        },
        {
          id: '4',
          title: 'Data Science & Analytics',
          description: 'Unlock insights from data using Python and machine learning',
          price: 7999,
          duration: 16,
          category: 'Data Science',
          difficulty: 'ADVANCED',
          enrolledCount: 15,
          maxStudents: 25,
          thumbnail: null
        },
        {
          id: '5',
          title: 'Business Development',
          description: 'Learn to identify opportunities and drive business growth',
          price: 4499,
          duration: 6,
          category: 'Business',
          difficulty: 'BEGINNER',
          enrolledCount: 20,
          maxStudents: 30,
          thumbnail: null
        }
      ];

      setInternships(mockInternships);
      setTotalPages(1);
      setLoading(false);
    };

    fetchInternships();
  }, [filters, currentPage]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  };

  const createLocalEnrollment = (internshipId) => {
    const storeKey = 'demo_enrollments';
    const load = () => { try { return JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch { return []; } };
    const save = (arr) => { try { localStorage.setItem(storeKey, JSON.stringify(arr)); } catch {} };
    const makeId = () => Math.random().toString(36).slice(2, 10);
    const now = new Date().toISOString();
    const enrollment = {
      id: makeId(),
      status: 'ACTIVE',
      enrolledAt: now,
      progressPercentage: 0,
      completedTasks: 0,
      totalTasks: 0,
      paymentStatus: 'PENDING',
      certificateIssued: false,
      tasks: [],
      internship: {
        id: internshipId,
        title: `Course ${internshipId}`,
        duration: 8,
        category: 'General'
      },
      student: { firstName: 'Demo', lastName: 'User', email: 'demo@example.com' }
    };
    const list = load();
    list.unshift(enrollment);
    save(list);
    return enrollment;
  };

  const handleEnroll = async (internshipId) => {
    try {
      const res = await internshipAPI.enrollInternship(internshipId);
      const newEnrollment = res?.data?.enrollment;
      if (newEnrollment) {
        const prev = queryClient.getQueryData('my-enrollments');
        const prevList = Array.isArray(prev?.data) ? prev.data : Array.isArray(prev) ? prev : [];
        queryClient.setQueryData('my-enrollments', { data: [newEnrollment, ...prevList] });
      }
      toast.success('Successfully enrolled! Redirecting to My Courses...');
      navigate('/courses');
    } catch (error) {
      const fallback = createLocalEnrollment(internshipId);
      const prev = queryClient.getQueryData('my-enrollments');
      const prevList = Array.isArray(prev?.data) ? prev.data : Array.isArray(prev) ? prev : [];
      queryClient.setQueryData('my-enrollments', { data: [fallback, ...prevList] });
      toast.success('Enrolled (offline). Redirecting to My Courses...');
      navigate('/courses');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Explore Internship Programs
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Choose from our comprehensive range of industry-focused internship programs 
          designed to accelerate your career growth.
        </p>
      </div>

      {/* Filters */}
      <InternshipFilter 
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
      />

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Available Programs
          </h2>
          <p className="text-gray-600">
            {internships.length} program{internships.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <InternshipGrid 
          internships={internships}
          loading={loading}
          onEnroll={handleEnroll}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Internships;
