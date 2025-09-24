import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useContentKeys } from '../../hooks/useContent';

const Layout = () => {
  const { data: items = [] } = useContentKeys(['ui.studentBackgroundUrl']);
  const bgUrl = (items.find(i => i.key === 'ui.studentBackgroundUrl')?.value) || '';
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white relative">
      {bgUrl ? (
        <div
          className="pointer-events-none absolute inset-0 bg-center bg-cover opacity-10"
          style={{ backgroundImage: `url(${bgUrl})` }}
          aria-hidden="true"
        />
      ) : null}
      <Navbar />
      <div className="flex pt-16 relative">
        <Sidebar />
        <main className="flex-1">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
