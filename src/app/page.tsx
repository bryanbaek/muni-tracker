'use client';

import TransitTracker from '@/components/TransitTracker';

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <h1 className="text-2xl font-bold text-center mb-6">SF Muni Tracker</h1>
      <TransitTracker />
    </main>
  );
}