"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { AlertTriangle, Eye } from 'lucide-react';

export default function MissingDataPage() {
  const [intakes, setIntakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntake, setSelectedIntake] = useState(null);

  useEffect(() => {
    const fetchIntakes = async () => {
      try {
        const res = await fetch('/api/intakes/incomplete');
        if (res.ok) {
          const data = await res.json();
          setIntakes(Array.isArray(data) ? data : data.intakes || []);
        }
      } catch {
        setIntakes([]);
      }
      setLoading(false);
    };
    fetchIntakes();
  }, []);

  const getMissingFields = (intake: any) => {
    const fields = [];
    if (!intake.phone) fields.push('Phone');
    if (!intake.email) fields.push('Email');
    if (!intake.date_of_birth) fields.push('DOB');
    if (!intake.emergency_contact) fields.push('Emergency Contact');
    if (!intake.medical_history) fields.push('Medical History');
    return fields;
  };

  return (
    <PageShell title="Missing Data QA" subtitle="Track and resolve incomplete intake information">
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900">Incomplete Intakes</p>
            <p className="text-sm text-yellow-800 mt-1">{intakes.length} intakes have missing required information</p>
          </div>
        </div>

        {loading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        ) : intakes.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Eye className="mx-auto mb-4 text-gray-400" size={32} />
            <p>All intakes have complete data</p>
          </div>
        ) : (
          <div className="space-y-3">
            {intakes.map(intake => {
              const missing = getMissingFields(intake);
              return (
                <div key={intake._id} className="border rounded-lg p-4 hover:shadow transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{intake.student_name}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {missing.map(field => (
                          <span key={field} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-medium">
                            Missing: {field}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedIntake(intake)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium hover:bg-blue-200"
                    >
                      Review
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
