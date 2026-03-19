"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Plus } from 'lucide-react';

export default function NewFormsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) return <PageShell title="New Forms"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></PageShell>;

  return (
    <PageShell title="New Forms" subtitle="Create and manage assessment forms">
      <div className="space-y-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
          <Plus size={18} /> Create New Form
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['PHQ-9 (Depression)', 'GAD-7 (Anxiety)', 'PSS (Stress)', 'Custom Assessment'].map(form => (
            <div key={form} className="border rounded p-4 hover:shadow transition cursor-pointer">
              <h3 className="font-semibold text-gray-900">{form}</h3>
              <button className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700">Create → </button>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
