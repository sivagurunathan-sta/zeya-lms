// src/pages/Student/Profile.js
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Edit,
  Save,
  X,
  Camera,
  Award,
  BookOpen,
  Clock,
  TrendingUp
} from 'lucide-react';
import { updateProfile } from '../../store/slices/authSlice';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Input from '../../components/Form/Input';
import Textarea from '../../components/Form/Textarea';
import Badge from '../../components/UI/Badge';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { formatters } from '../../utils/formatters';
import toast from 'react-hot-toast';

const Profile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
      linkedinUrl: user?.linkedinUrl || '',
      githubUrl: user?.githubUrl || '',
    }
  });

  // Mock data - replace with real API calls
  const stats = {
    coursesCompleted: 3,
    coursesActive: 2,
    certificatesEarned: 2,
    totalHoursLearned: 120,
    averageScore: 88,
    streak: 15
  };

  const recentActivity = [
    {
      id: '1',
      type: 'course_completed',
      title: 'Completed Full Stack Web Development',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      icon: BookOpen,
      color: 'green'
    },
    {
      id: '2',
      type: 'certificate_earned',
      title: 'Earned Digital Marketing Certificate',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      icon: Award,
      color: 'purple'
    },
    {
      id: '3',
      type: 'task_submitted',
      title: 'Submitted React Components Task',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      icon: Clock,
      color: 'blue'
    }
  ];

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      dispatch(updateProfile(data));
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  const handleAvatarUpload = () => {
    // Implement avatar upload functionality
    toast.info('Avatar upload functionality coming soon!');
  };

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2">
          <Card>
            <div className="p-6">
              {isEditing ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="flex items-center space-x-6 mb-6">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                      </div>
                      <button
                        type="button"
                        onClick={handleAvatarUpload}
                        className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      >
                        <Camera className="w-3 h-3 text-gray-600" />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Profile Picture</h3>
                      <p className="text-sm text-gray-600">Click the camera icon to upload a new photo</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      {...register('firstName', { required: 'First name is required' })}
                      error={errors.firstName?.message}
                    />
                    <Input
                      label="Last Name"
                      {...register('lastName', { required: 'Last name is required' })}
                      error={errors.lastName?.message}
                    />
                  </div>

                  <Input
                    label="Email"
                    type="email"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    error={errors.email?.message}
                  />

                  <Input
                    label="Phone"
                    type="tel"
                    {...register('phone')}
                    error={errors.phone?.message}
                  />

                  <Textarea
                    label="Bio"
                    {...register('bio')}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="LinkedIn URL"
                      {...register('linkedinUrl')}
                      placeholder="https://linkedin.com/in/username"
                    />
                    <Input
                      label="GitHub URL"
                      {...register('githubUrl')}
                      placeholder="https://github.com/username"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      loading={loading}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Avatar and Basic Info */}
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {user.firstName} {user.lastName}
                      </h2>
                      <p className="text-gray-600">{user.email}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="primary" size="sm">Student</Badge>
                        <Badge variant="success" size="sm">Active</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">Email</div>
                          <div className="font-medium">{user.email}</div>
                        </div>
                      </div>
                      
                      {user.phone && (
                        <div className="flex items-center space-x-3">
                          <Phone className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-500">Phone</div>
                            <div className="font-medium">{user.phone}</div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">Joined</div>
                          <div className="font-medium">
                            {formatters.date(user.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {user.linkedinUrl && (
                        <div>
                          <div className="text-sm text-gray-500 mb-1">LinkedIn</div>
                          <a 
                            href={user.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium"
                          >
                            View Profile
                          </a>
                        </div>
                      )}
                      
                      {user.githubUrl && (
                        <div>
                          <div className="text-sm text-gray-500 mb-1">GitHub</div>
                          <a 
                            href={user.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium"
                          >
                            View Profile
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {user.bio && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
                      <p className="text-gray-700 leading-relaxed">{user.bio}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Courses Completed</span>
                  <span className="font-semibold text-green-600">{stats.coursesCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Courses</span>
                  <span className="font-semibold text-blue-600">{stats.coursesActive}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Certificates</span>
                  <span className="font-semibold text-purple-600">{stats.certificatesEarned}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Hours</span>
                  <span className="font-semibold text-orange-600">{stats.totalHoursLearned}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Score</span>
                  <span className="font-semibold text-gray-900">{stats.averageScore}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Learning Streak</span>
                  <span className="font-semibold text-yellow-600">{stats.streak} days</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((activity) => {
                  const IconComponent = activity.icon;
                  const colorClasses = {
                    green: 'bg-green-100 text-green-600',
                    blue: 'bg-blue-100 text-blue-600',
                    purple: 'bg-purple-100 text-purple-600',
                    orange: 'bg-orange-100 text-orange-600'
                  };

                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClasses[activity.color]}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatters.relativeTime(activity.date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Achievements */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Award className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">First Course</div>
                    <div className="text-xs text-gray-500">Completed your first course</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">High Achiever</div>
                    <div className="text-xs text-gray-500">Maintained 80%+ average</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Consistent Learner</div>
                    <div className="text-xs text-gray-500">15-day learning streak</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;