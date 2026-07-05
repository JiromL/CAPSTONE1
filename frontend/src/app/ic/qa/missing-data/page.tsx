"use client";

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '@/utils/api';

export default function MissingDataPage() {
  const [intakes, setIntakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    const fetchIntakes = async () => {
      try {
        const res = await fetch(api('/api/intake/list?status=incomplete'), {
          headers: { Authorization: `Bearer ${token()}` },
        });
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Incomplete Intakes</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {loading ? 'Loading…' : `${intakes.length} intake${intakes.length !== 1 ? 's' : ''} have missing required information`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : intakes.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <CheckCircle2 className="mx-auto mb-4 text-green-400" size={32} />
            <p>All intakes have complete data</p>
          </div>
        ) : (
          <div className="space-y-3">
            {intakes.map(intake => {
              const missing = getMissingFields(intake);
              return (
                <div key={intake._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{intake.student_name}</h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {missing.length > 0 ? missing.map(field => (
                          <span key={field} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                            Missing: {field}
                          </span>
                        )) : (
                          <span className="text-xs text-gray-400">No missing fields detected</span>
                        )}
                      </div>
                    </div>
                    <a
                      href={`/ic/intake/conduct/${intake._id}`}
                      className="px-3 py-1.5 bg-[#2563eb] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex-shrink-0"
                    >
                      Review
                    </a>
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
