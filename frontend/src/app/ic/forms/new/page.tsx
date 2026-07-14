"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Plus } from 'lucide-react';

export default function NewFormsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLoading(false); }, []);

  if (loading) return (
    <PageShell title="New Forms">
      <div className="animate-spin rounded-full h-8 w-8"
        style={{ borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent', borderBottomColor: 'var(--color-primary)' }} />
    </PageShell>
  );

  return (
    <PageShell title="New Forms" subtitle="Create and manage assessment forms">
      <div className="space-y-4">
        <button className="flex items-center gap-2 px-4 py-2 text-white rounded text-sm font-medium transition"
          style={{ background: 'var(--color-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}>
          <Plus size={18} /> Create New Form
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['PHQ-9 (Depression)', 'GAD-7 (Anxiety)', 'PSS (Stress)', 'Custom Assessment'].map(form => (
            <div key={form} className="rounded p-4 transition cursor-pointer"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-card-md)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
              <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{form}</h3>
              <button className="mt-3 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>Create → </button>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
