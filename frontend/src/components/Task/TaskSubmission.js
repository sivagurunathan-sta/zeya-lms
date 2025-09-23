import React, { useState } from 'react';
import { Send } from 'lucide-react';
import Button from '../UI/Button';
import Textarea from '../Form/Textarea';
import FileUpload from '../Form/FileUpload';
import Modal from '../UI/Modal';

const TaskSubmission = ({ isOpen, onClose, task, onSubmit, loading }) => {
  const [submissionData, setSubmissionData] = useState({
    submissionText: '',
    files: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(task.id, submissionData);
  };

  const handleFilesChange = (files) => {
    setSubmissionData(prev => ({
      ...prev,
      files
    }));
  };

  const resetForm = () => {
    setSubmissionData({
      submissionText: '',
      files: []
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Submit: ${task?.title}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Task Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Task Description</h4>
          <p className="text-blue-800 text-sm">{task?.description}</p>
          {task?.guidelines && (
            <div className="mt-3">
              <h5 className="font-medium text-blue-900 mb-1">Submission Guidelines</h5>
              <p className="text-blue-800 text-sm">{task.guidelines}</p>
            </div>
          )}
        </div>

        {/* Resources */}
        {task?.resources && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Resources</h4>
            <div className="space-y-2">
              {task.resources.videos && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Videos:</span>
                  <ul className="list-disc list-inside text-sm text-blue-600 ml-4">
                    {task.resources.videos.map((video, index) => (
                      <li key={index}>
                        <a href={video} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          Video {index + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {task.resources.documents && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Documents:</span>
                  <ul className="list-disc list-inside text-sm text-blue-600 ml-4">
                    {task.resources.documents.map((doc, index) => (
                      <li key={index}>
                        <a href={doc} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          Document {index + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submission Form */}
        <div className="space-y-4">
          <Textarea
            label="Your Submission"
            placeholder="Describe what you've learned, challenges faced, and how you completed the task..."
            value={submissionData.submissionText}
            onChange={(e) => setSubmissionData(prev => ({
              ...prev,
              submissionText: e.target.value
            }))}
            rows={6}
            required
          />

          <FileUpload
            label="Upload Files (Optional)"
            onFilesChange={handleFilesChange}
            multiple={true}
            acceptedFileTypes=".pdf,.doc,.docx,.txt,.zip,.png,.jpg,.jpeg"
            maxFileSize={10 * 1024 * 1024} // 10MB
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            loading={loading}
            disabled={!submissionData.submissionText.trim()}
          >
            <Send className="w-4 h-4 mr-2" />
            Submit Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskSubmission;