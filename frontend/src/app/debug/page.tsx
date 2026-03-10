import React, { useState, useEffect } from 'react';

export default function IntakeDebugTest() {
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    // Simulate receiving the appointment data from the API
    const mockData = {
      "appointment_date": "2026-03-14T11:17:58.992768",
      "join_url": "https://zoom.us/j/219941975",
      "meeting_id": "219941975",
      "passcode": "663769",
      "platform": "Zoom Video Conference",
      "preferred_platform": "zoom"
    };

    setAppointmentData(mockData);
    
    // Create debug info
    const debug = `
AppointmentData: ${JSON.stringify(mockData, null, 2)}

Checking conditions:
- appointmentData?.platform === 'Zoom Video Conference': ${mockData?.platform === 'Zoom Video Conference'}
- appointmentData?.preferred_platform === 'zoom': ${mockData?.preferred_platform === 'zoom'}
- appointmentData?.join_url exists: ${!!mockData?.join_url}
- Full check: ${(mockData?.platform === 'Zoom Video Conference' || mockData?.preferred_platform === 'zoom') && mockData?.join_url}

Display should show: YES, Zoom Meeting Details Block
    `;
    setDebugInfo(debug);
  }, []);

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl mb-4">Appointment Data Debug</h1>
      
      <div className="bg-gray-800 p-4 rounded mb-6 text-sm whitespace-pre-wrap font-mono">
        {debugInfo}
      </div>

      <div className="border border-gray-600 p-6 bg-gray-800 rounded">
        <h2 className="text-lg font-semibold mb-4">Rendered Output:</h2>

        {appointmentData && (
          <>
            <div className="p-2 bg-gray-700 rounded mb-3 text-xs text-gray-300 break-all font-mono">
              <div>Type: {typeof appointmentData}</div>
              <div>Platform: {appointmentData.platform || appointmentData.preferred_platform}</div>
              <div>Has join_url: {!!appointmentData.join_url}</div>
            </div>
            
            {(appointmentData.platform === 'Zoom Video Conference' || appointmentData.preferred_platform === 'zoom') && appointmentData.join_url && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">🎥 ZOOM MEETING DETAILS:</p>
                <div className="space-y-2">
                  <a 
                    href={appointmentData.join_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block p-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium text-center"
                  >
                    Join Zoom Meeting →
                  </a>
                  <div className="p-2 bg-gray-900 dark:bg-gray-800 rounded text-xs font-mono text-white break-all space-y-1">
                    <div><span className="text-gray-400">Meeting ID:</span> <span className="text-blue-300 font-bold">{appointmentData.meeting_id}</span></div>
                    {appointmentData.passcode && <div><span className="text-gray-400">Passcode:</span> <span className="text-blue-300 font-bold">{appointmentData.passcode}</span></div>}
                    <div><span className="text-gray-400">Link:</span><br/><span className="text-blue-300 underline">{appointmentData.join_url}</span></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
