import React from 'react';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center font-sans antialiased overflow-hidden">
      {children}
    </div>
  );
}
