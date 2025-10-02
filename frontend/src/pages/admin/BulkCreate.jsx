import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const BulkCreate = () => {
  const navigate = useNavigate();
  const [count, setCount] = useState(10);
  const [prefix, setPrefix] = useState('INT');
  const [role, setRole] = useState('INTERN');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setResults([]);
    setLoading(true);

    try {
      const response = await api.post('/admin/users/bulk-generate', { count: parseInt(count, 10), prefix, role });
      if (response.data && response.data.data) {
        setResults(response.data.data);
        // Generate CSV
        const csvRows = [];
        csvRows.push(['userId', 'email', 'name', 'password'].join(','));
        response.data.data.forEach(u => {
          csvRows.push([u.userId, u.email, `"${u.name.replace(/"/g, '""')}"`, u.password].join(','));
        });
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'generated-users.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        setError('No users created');
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err.message || 'Failed to generate users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Bulk Generate Users</h2>
              <p className="text-sm text-gray-500">Generate user IDs and passwords and download as CSV</p>
            </div>
            <div>
              <button onClick={() => navigate('/admin/dashboard')} className="bg-gray-200 px-4 py-2 rounded">Back</button>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Count</label>
              <input type="number" min="1" value={count} onChange={(e) => setCount(e.target.value)} className="mt-1 block w-full border rounded p-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Prefix</label>
              <input value={prefix} onChange={(e) => setPrefix(e.target.value)} className="mt-1 block w-full border rounded p-2" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 block w-full border rounded p-2">
                <option value="INTERN">INTERN</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div className="md:col-span-3 mt-4">
              <button disabled={loading} type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                {loading ? 'Generating...' : 'Generate & Download CSV'}
              </button>
            </div>
          </form>

          {error && <div className="mt-4 text-red-600">{error}</div>}
        </div>

        {results.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Created Users</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr>
                    <th className="px-2 py-1">User ID</th>
                    <th className="px-2 py-1">Email</th>
                    <th className="px-2 py-1">Name</th>
                    <th className="px-2 py-1">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.userId}>
                      <td className="px-2 py-1">{r.userId}</td>
                      <td className="px-2 py-1">{r.email}</td>
                      <td className="px-2 py-1">{r.name}</td>
                      <td className="px-2 py-1">{r.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkCreate;
