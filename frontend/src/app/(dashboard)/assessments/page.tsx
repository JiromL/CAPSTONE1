"use client";

import { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';

export default function AssessmentsPage() {
  const [caseId, setCaseId] = useState('');
  const [assessmentType, setAssessmentType] = useState('phq9');
  const [loading, setLoading] = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);

  const assessmentTypes = [
    { value: 'phq9', label: 'PHQ-9 (Depression Screening)' },
    { value: 'gad7', label: 'GAD-7 (Anxiety Screening)' },
    { value: 'pss', label: 'PSS (Perceived Stress Scale)' },
  ];

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/assessments/${caseId}/triage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assessment_type: assessmentType,
            responses: {},
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAssessments([data, ...assessments]);
        setCaseId('');
      }
    } catch (error) {
      console.error('Error creating assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Triage & Assessment" subtitle="Create assessments with auto-scoring">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">New Assessment</h2>
          <form onSubmit={handleCreateAssessment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Case ID</label>
              <input type="number" value={caseId} onChange={(e) => setCaseId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Type</label>
              <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md">
                {assessmentTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md">{loading ? 'Creating...' : 'Create Assessment'}</button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Assessments</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {assessments.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">No assessments yet</div>
            ) : (
              assessments.map((assessment) => (
                <div key={assessment.assessment_id} className="px-6 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{assessment.assessment_type.toUpperCase()}</h3>
                      <p className="text-sm text-gray-600">Case: {assessment.case_id}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${assessment.risk_level === 'critical' ? 'bg-red-100 text-red-800' : assessment.risk_level === 'red' ? 'bg-orange-100 text-orange-800' : assessment.risk_level === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{assessment.risk_level}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
