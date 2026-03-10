import { api } from './api';

/**
 * Fetch dashboard data for the current user
 * Returns role-specific data from the backend
 */
export async function fetchDashboardData(token: string) {
  try {
    const url = api('/api/intake/assessments/dashboard');
    console.log('Fetching dashboard from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Dashboard fetch failed with status ${response.status}:`, errorText);
      throw new Error(`Dashboard fetch failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
}

/**
 * Fetch urgent assessments for the current user
 */
export async function fetchUrgentAssessments(token: string) {
  try {
    const response = await fetch(api('/api/intake/assessments/urgent'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Urgent assessments fetch failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching urgent assessments:', error);
    throw error;
  }
}

/**
 * Fetch system-wide assessment statistics (admin only)
 */
export async function fetchAssessmentStats(token: string) {
  try {
    const response = await fetch(api('/api/intake/assessments/stats'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Stats fetch failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching assessment stats:', error);
    throw error;
  }
}

/**
 * Fetch appointments for a counselor
 */
export async function fetchAppointments(token: string) {
  try {
    const response = await fetch(api('/api/appointments'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Appointments fetch failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Get risk level color class
 */
export function getRiskLevelColor(level: string): string {
  switch (level) {
    case 'CRITICAL':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'RED':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'YELLOW':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'GREEN':
      return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}
