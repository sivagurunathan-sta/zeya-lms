import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminAPI } from '../../services/adminAPI';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { CheckCircle, Plus, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const UserIdManager = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [role, setRole] = useState('user');

  const { data, isLoading } = useQuery(['admin-users'], async () => {
    const res = await adminAPI.listUsers();
    return res.data?.data?.users || [];
  });

  const createMutation = useMutation((payload) => adminAPI.createUser(payload), {
    onSuccess: (res) => {
      const userId = res.data?.data?.userId;
      toast.success('User created');
      if (userId) navigator.clipboard?.writeText(userId).catch(() => {});
      qc.invalidateQueries(['admin-users']);
      setForm({ name: '', email: '', password: '' });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('All fields are required');
      return;
    }
    createMutation.mutate({ ...form, role });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">User ID Management</h1>
      </div>

      {/* Create form */}
      <Card>
        <form className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleCreate}>
          <div>
            <label className="text-sm font-medium text-gray-700">Full Name</label>
            <input value={form.name} onChange={(e)=>setForm(v=>({...v,name:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Jane Doe" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={form.email} onChange={(e)=>setForm(v=>({...v,email:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="jane@example.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Temporary Password</label>
            <input type="password" value={form.password} onChange={(e)=>setForm(v=>({...v,password:e.target.value}))} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="Set password" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select value={role} onChange={(e)=>setRole(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500">
              <option value="user">Intern</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <Button type="submit" loading={createMutation.isLoading}>
              <Plus className="w-4 h-4 mr-2" />
              Create User ID
            </Button>
          </div>
        </form>
      </Card>

      {/* Users table */}
      <Card>
        <div className="p-6 overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((u) => (
                <tr key={u.userId}>
                  <td className="px-4 py-2 font-mono text-sm">{u.userId}</td>
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.role}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(u.userId).then(()=>toast.success('Copied')); }}>
                      <Copy className="w-4 h-4 mr-2" /> Copy ID
                    </Button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>No users yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center text-sm text-gray-600">
        <CheckCircle className="w-4 h-4 text-green-600 mr-2" /> Interns can only login using their User ID or email. Details are fixed for interns.
      </div>
    </div>
  );
};

export default UserIdManager;
