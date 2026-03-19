"use client";

import { useEffect, useState } from 'react';
import { DashboardPageWrapper } from '@/components/DashboardPageWrapper';
import { useRouter } from 'next/navigation';

interface Resource {
  _id: string;
  title: string;
  description?: string;
  file_name: string;
  uploaded_by_role: string;
  created_at: string;
}

interface ResourceResponse {
  case_found?: boolean;
  case_id?: string;
  assigned_to?: string;
  assigned_role?: string;
  resources_count: number;
  resources: Resource[];
  message?: string;
}

export default function ResourcesPage() {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [counselorName, setCounselorName] = useState('');
  const [caseFound, setCaseFound] = useState(false);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}/api/resources/student`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data: ResourceResponse = await response.json();

        if (response.ok) {
          setResources(data.resources || []);
          setCaseFound(data.case_found !== false);
          if (data.assigned_to) {
            setCounselorName(
              `${data.assigned_to} (${data.assigned_role || 'Staff'})`
            );
          }
          if (data.message) {
            setError(data.message);
          }
        } else {
          setError(data.message || 'Failed to load resources');
        }
      } catch (err) {
        setError('Error loading resources. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [router]);

  const handleDownload = async (resourceId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/resources/${resourceId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.download_url) {
        // Open in new tab
        window.open(data.download_url, '_blank');
      } else {
        alert('Failed to download resource');
      }
    } catch (err) {
      alert('Error downloading resource');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <DashboardPageWrapper title="Wellness Resources">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-50"></div>
        </div>
      </DashboardPageWrapper>
    );
  }

  return (
    <DashboardPageWrapper title="Wellness Resources">
      <div className="max-w-4xl mx-auto">
        {/* Info Banner */}
        {!caseFound ? (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
            <p className="text-blue-900">
              📋 Complete your intake to connect with a counselor and access personalized wellness resources.
            </p>
          </div>
        ) : error && !resources.length ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded">
            <p className="text-yellow-900">{error}</p>
          </div>
        ) : counselorName ? (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
            <p className="text-green-900">
              ✓ Resources from your counselor: <strong>{counselorName}</strong>
            </p>
          </div>
        ) : null}

        {/* Resources Grid */}
        {resources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource) => (
              <div
                key={resource._id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {resource.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {resource.file_name}
                    </p>
                  </div>
                  <div className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full whitespace-nowrap">
                    {resource.uploaded_by_role}
                  </div>
                </div>

                {resource.description && (
                  <p className="text-gray-600 text-sm mb-4">{resource.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>
                    📅{' '}
                    {new Date(resource.created_at).toLocaleDateString()}
                  </span>
                </div>

                <button
                  onClick={() => handleDownload(resource._id)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                >
                  📥 Download
                </button>
              </div>
            ))}
          </div>
        ) : caseFound ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="font-semibold text-gray-900 mb-2">
              No resources yet
            </h3>
            <p className="text-gray-600">
              Your counselor will upload wellness resources here as you progress
              in your care.
            </p>
          </div>
        ) : null}

        {/* Help Section */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">❓ How to use resources</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              • Resources are shared by your assigned counselor or psychologist
            </li>
            <li>
              • You can download and save them to your device
            </li>
            <li>
              • Resources are tailored to support your specific needs
            </li>
            <li>
              • Complete your intake to get connected with a counselor
            </li>
          </ul>
        </div>
      </div>
    </DashboardPageWrapper>
  );
}

