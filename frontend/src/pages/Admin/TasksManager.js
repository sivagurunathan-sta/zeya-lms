import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { adminAPI } from '../../services/adminAPI';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

const TasksManager = () => {
  const [form, setForm] = useState({ taskNumber: '', title: '', description: '', instructions: '', category: 'frontend', difficulty: 'medium', estimatedTime: 4, isPaidTask: false, price: 0 });
  const upsert = useMutation((payload) => adminAPI.upsertTask(payload), {
    onSuccess: () => {
      toast.success('Task saved');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.taskNumber || !form.title || !form.description || !form.instructions) {
      toast.error('Please fill all required fields');
      return;
    }
    upsert.mutate({
      ...form,
      taskNumber: Number(form.taskNumber),
      estimatedTime: Number(form.estimatedTime),
      price: Number(form.price)
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tasks Manager</h1>
      <Card>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Task Number</label>
            <input type="number" value={form.taskNumber} onChange={(e)=>setForm(v=>({...v,taskNumber:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select value={form.category} onChange={(e)=>setForm(v=>({...v,category:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2">
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="fullstack">Fullstack</option>
              <option value="database">Database</option>
              <option value="api">API</option>
              <option value="testing">Testing</option>
              <option value="deployment">Deployment</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Title</label>
            <input value={form.title} onChange={(e)=>setForm(v=>({...v,title:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea value={form.description} onChange={(e)=>setForm(v=>({...v,description:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2" rows={3} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Instructions</label>
            <textarea value={form.instructions} onChange={(e)=>setForm(v=>({...v,instructions:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2" rows={4} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Difficulty</label>
            <select value={form.difficulty} onChange={(e)=>setForm(v=>({...v,difficulty:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Estimated Hours</label>
            <input type="number" value={form.estimatedTime} onChange={(e)=>setForm(v=>({...v,estimatedTime:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Paid Task?</label>
            <select value={form.isPaidTask ? 'yes' : 'no'} onChange={(e)=>setForm(v=>({...v,isPaidTask:e.target.value==='yes'}))} className="w-full rounded-md border border-gray-300 px-3 py-2">
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Price (if paid)</label>
            <input type="number" value={form.price} onChange={(e)=>setForm(v=>({...v,price:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" loading={upsert.isLoading}><Save className="w-4 h-4 mr-2"/> Save Task</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default TasksManager;
