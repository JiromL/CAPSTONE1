'use client';

import { useState } from 'react';

export default function MeetingLinkTestPage() {
  const [testData, setTestData] = useState({
    "appointment_date": "2026-03-14T11:34:14.777091",
    "join_url": "https://zoom.us/j/963086615",
    "meeting_id": "963086615",
    "passcode": "513358",
    "platform": "Zoom Video Conference",
    "preferred_platform": "zoom"
  });

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Meeting Link Display Test</h1>
        
        <div className="bg-gray-800 p-4 rounded mb-6">
          <p className="text-sm text-gray-400 mb-2">Test Data:</p>
          <pre className="text-xs overflow-auto">{JSON.stringify(testData, null, 2)}</pre>
        </div>

        <div className="bg-gray-800 p-8 rounded mb-6">
          <h2 className="text-xl font-bold mb-4">Expected Display:</h2>
          
          {testData?.join_url && (
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-400 dark:border-purple-600 rounded animate-pulse">
              <p className="text-xs font-bold text-purple-900 dark:text-purple-200 mb-3">✅ MEETING LINK READY</p>
              <a 
                href={testData.join_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block p-3 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded font-bold text-center mb-3 transition"
              >
                🎥 {testData.preferred_platform === 'zoom' ? 'JOIN ZOOM' : testData.preferred_platform === 'google_meet' ? 'JOIN GOOGLE MEET' : 'JOIN MEETING'} →
              </a>
              <div className="p-2 bg-gray-900 dark:bg-gray-800 rounded text-xs font-mono text-white break-all space-y-2">
                {testData.meeting_id && (
                  <div><span className="text-gray-400">Meeting ID:</span> <span className="text-purple-300 font-bold">{testData.meeting_id}</span></div>
                )}
                {testData.passcode && (
                  <div><span className="text-gray-400">Passcode:</span> <span className="text-purple-300 font-bold">{testData.passcode}</span></div>
                )}
                {testData.meeting_code && (
                  <div><span className="text-gray-400">Code:</span> <span className="text-purple-300 font-bold">{testData.meeting_code}</span></div>
                )}
                <div><span className="text-gray-400">Link:</span></div>
                <div className="text-purple-300 underline break-all text-xs">{testData.join_url}</div>
              </div>
            </div>
          )}

          {!testData?.join_url && (
            <div className="p-3 bg-red-900/20 border-2 border-red-600 rounded">
              <p className="text-xs font-bold text-red-200">❌ NO MEETING LINK</p>
            </div>
          )}
        </div>

        <div className="bg-gray-800 p-4 rounded text-sm">
          <p className="text-gray-400 mb-2">Debug Info:</p>
          <ul className="space-y-1 text-xs font-mono">
            <li>join_url exists: {testData?.join_url ? '✅ YES' : '❌ NO'}</li>
            <li>appointment data type: {typeof testData}</li>
            <li>platform: {testData.platform}</li>
            <li>preferred_platform: {testData.preferred_platform}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
