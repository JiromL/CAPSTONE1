import { useState, useCallback } from 'react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000') + '/api';

interface UseIntakeApiOptions {
  headers?: Record<string, string>;
}

export function useIntakeApi(options: UseIntakeApiOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };
  }, [options.headers]);

  const createIntake = useCallback(
    async (data: any) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/cases/create`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create intake');
        }

        const result = await response.json();
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  const updateCaseStatus = useCallback(
    async (caseId: string, clientStatus: string, reason?: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/cases/${caseId}/status`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            client_status: clientStatus,
            status_change_reason: reason,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update case status');
        }

        const result = await response.json();
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  const getCase = useCallback(
    async (caseId: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/cases/${caseId}`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.message || 'Failed to fetch case');
        }

        const result = await response.json();
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  return {
    loading,
    error,
    createIntake,
    updateCaseStatus,
    getCase,
  };
}

export function useCheckInApi(options: UseIntakeApiOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };
  }, [options.headers]);

  const createCheckIn = useCallback(
    async (data: any) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/check-ins/create`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create check-in');
        }

        const result = await response.json();
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  const getCheckInHistory = useCallback(
    async (caseId: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/check-ins/${caseId}/history`,
          {
            method: 'GET',
            headers: getAuthHeaders(),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.message || 'Failed to fetch check-in history');
        }

        const result = await response.json();
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  const getPendingCheckIns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/check-ins/list`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Failed to fetch pending check-ins'
        );
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const getCheckInDetails = useCallback(
    async (checkInId: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/check-ins/${checkInId}`,
          {
            method: 'GET',
            headers: getAuthHeaders(),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || 'Failed to fetch check-in details'
          );
        }

        const result = await response.json();
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  const updateCheckIn = useCallback(
    async (checkInId: string, data: any) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/check-ins/${checkInId}`,
          {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update check-in');
        }

        const result = await response.json();
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  const getCheckInSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/check-ins/summary/status`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Failed to fetch check-in summary'
        );
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  return {
    loading,
    error,
    createCheckIn,
    getCheckInHistory,
    getPendingCheckIns,
    getCheckInDetails,
    updateCheckIn,
    getCheckInSummary,
  };
}
