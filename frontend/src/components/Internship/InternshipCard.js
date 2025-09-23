import React from 'react';
import { Clock, Users, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../UI/Badge';
import Button from '../UI/Button';

const InternshipCard = ({ internship, onEnroll }) => {
  const {
    id,
    title,
    description,
    price,
    duration,
    category,
    difficulty,
    enrolledCount,
    maxStudents,
    thumbnail
  } = internship;

  const difficultyColors = {
    BEGINNER: 'success',
    INTERMEDIATE: 'warning',
    ADVANCED: 'danger'
  };

  const spotsLeft = maxStudents - enrolledCount;
  const isAlmostFull = spotsLeft <= 5;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Thumbnail */}
      {thumbnail && (
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600">
          <img 
            src={thumbnail} 
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {!thumbnail && (
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-4xl font-bold mb-2">{category.charAt(0)}</div>
            <div className="text-sm opacity-80">{category}</div>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary" size="sm">{category}</Badge>
              <Badge variant={difficultyColors[difficulty]} size="sm">
                {difficulty}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">₹{price.toLocaleString()}</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{description}</p>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{duration} weeks</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{enrolledCount}/{maxStudents}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>4.8</span>
          </div>
        </div>

        {/* Availability Alert */}
        {isAlmostFull && (
          <div className="mb-4 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
            <span className="text-orange-600 font-medium">
              Only {spotsLeft} spots left!
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <Link 
            to={`/internships/${id}`}
            className="flex-1"
          >
            <Button variant="outline" className="w-full">
              View Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Button 
            onClick={() => onEnroll(id)}
            className="flex-1"
            disabled={spotsLeft === 0}
          >
            {spotsLeft === 0 ? 'Full' : 'Enroll Now'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InternshipCard;