"use client";

import { useState } from 'react';
import PageShell from '@/components/PageShell';
import IntakeForm from '@/components/IntakeForm';
import { useIntakeApi } from '@/utils/useApi';

export default function NewIntakePage() {
  const { createIntake, loading } = useIntakeApi();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitIntake = async (data: any) => {
    await createIntake(data);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <PageShell 
      title="New Intake" 
      subtitle={submitted ? "✓ Intake submitted successfully" : "Create a new intake for a student"}
    >
      <div className="max-w-2xl">
        <IntakeForm
          onSubmit={handleSubmitIntake}
          isLoading={loading}
        />
      </div>
    </PageShell>
  );
}
