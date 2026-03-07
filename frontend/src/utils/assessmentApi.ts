/**
 * Assessment API Integration - Role-based data fetching
 * Efficient queries for dashboard data from backend endpoints
 */

import { API_BASE_URL } from './api';

export interface RiskLevel {
  level: 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL';
  percentage: number;
}

export interface AssessmentScore {
  phq9_score?: number;
  gad7_score?: number;
  pss_score?: number;
  acad_score?: number;
  career_score?: number;
  social_score?: number;
}

export interface DashboardCase {
  case_id?: string;
  intake_id?: string;
  counseling_id: string;
  submitted_at: string;
  risk_level: string;
  is_emergency?: boolean;
  is_anonymous?: boolean;
  concern?: string;
  appointment_date?: string;
  scores?: AssessmentScore;
  phq9?: number;
  gad7?: number;
  pss?: number;
  assessments_taken?: number;
}

export interface DashboardData {
  user_role: string;
  timestamp: string;
  alerts: Array<{
    case_id: string;
    counseling_id: string;
    risk_level: string;
    concern?: string;
    type?: string;
  }>;
  summary: any;
  recent_cases: DashboardCase[];
}

export interface UrgentAssessment {
  intake_id: string;
  case_id: string;
  counseling_id: string;
  risk_level: string;
  is_emergency: boolean;
  concern?: string;
  scores: AssessmentScore;
  submitted_at: string;
}

/**
 * Fetch role-based assessment dashboard
 * Returns different data based on user's role
 */
export async function getDashboardData(token: string): Promise<DashboardData | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/assessments/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch dashboard:', response.status);
      return null;
    }

    const data: DashboardData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return null;
  }
}

/**
 * Fetch urgent/high-risk assessments
 * RED or CRITICAL cases, role-filtered
 */
export async function getUrgentAssessments(token: string): Promise<UrgentAssessment[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/assessments/urgent`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch urgent assessments:', response.status);
      return [];
    }

    const data = await response.json();
    return data.urgent_assessments || [];
  } catch (error) {
    console.error('Error fetching urgent assessments:', error);
    return [];
  }
}

/**
 * Fetch system-wide assessment statistics (Admin/DPO only)
 */
export async function getAssessmentStatistics(token: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/assessments/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch statistics:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return null;
  }
}

/**
 * Initialize database indexes (Admin/DPO only)
 */
export async function initializeAssessmentIndexes(token: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/assessments/init-indexes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return await response.json();
  } catch (error) {
    console.error('Error initializing indexes:', error);
    return { status: 'error', message: String(error) };
  }
}

/**
 * Format timestamp to readable format
 */
export function formatTimestamp(isoString: string | null | undefined): string {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format time with hours/minutes
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Get risk level badge color
 */
export function getRiskLevelColor(level: string): string {
  switch (level) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'RED':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'YELLOW':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'GREEN':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

/**
 * Get risk level icon/emoji
 */
export function getRiskLevelIcon(level: string): string {
  switch (level) {
    case 'CRITICAL':
      return '🚨';
    case 'RED':
      return '⚠️';
    case 'YELLOW':
      return '⚡';
    case 'GREEN':
      return '✅';
    default:
      return '❓';
  }
}
