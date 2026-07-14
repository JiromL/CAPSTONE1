"use client";

import ManualNotifyForm from '@/components/ManualNotifyForm';
import PageShell from '@/components/PageShell';

export default function SendPermaPage() {
  return (
    <PageShell title="Send PERMA History">
      <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Enter a student username to view their PERMA history and notify a counselor.
      </p>
      <ManualNotifyForm />
    </PageShell>
  );
}
