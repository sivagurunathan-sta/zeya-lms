import React, { useMemo, useState } from 'react';
import { useAllContent, useUpsertContent, useDeleteContent } from '../../hooks/useContent';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { Trash2, Save, Plus, RefreshCw } from 'lucide-react';

const defaultKeys = [
  { key: 'brand.name', label: 'Brand Name', placeholder: 'Student LMS' },
  { key: 'dashboard.welcomeSubtitle', label: 'Dashboard Welcome Subtitle', placeholder: 'Continue your learning journey and achieve your goals.' },
  { key: 'ui.activeCoursesTitle', label: 'Active Courses Title', placeholder: 'Active Courses' },
  { key: 'ui.viewAll', label: 'View All Button', placeholder: 'View All' },
  { key: 'ui.studentBackgroundUrl', label: 'Student Site Background Image URL', placeholder: 'https://example.com/background.jpg' },
];

const ContentManager = () => {
  const { data: items = [], isLoading, refetch } = useAllContent();
  const upsert = useUpsertContent();
  const del = useDeleteContent();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const map = useMemo(() => Object.fromEntries(items.map(i => [i.key, i.value])), [items]);

  const handleSave = async (key, value) => {
    if (!key) return;
    await upsert.mutateAsync({ key, value });
  };

  const handleAdd = async () => {
    if (!newKey.trim()) return;
    await upsert.mutateAsync({ key: newKey.trim(), value: newValue });
    setNewKey('');
    setNewValue('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Content Manager</h1>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {defaultKeys.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{label}</label>
              <input
                type="text"
                defaultValue={map[key] ?? ''}
                placeholder={placeholder}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onBlur={(e) => handleSave(key, e.target.value || placeholder)}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">All Content</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.key}>
                    <td className="px-3 py-2 font-mono text-sm text-gray-700 whitespace-nowrap">{item.key}</td>
                    <td className="px-3 py-2 w-full">
                      <input
                        type="text"
                        defaultValue={String(item.value ?? '')}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onBlur={(e) => handleSave(item.key, e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Button variant="danger" size="sm" onClick={() => del.mutate({ key: item.key })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="new.key.path"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ContentManager;
