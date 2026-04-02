/**
 * DressGenius — useUsage hook
 *
 * Fetches usage data from GET /me and exposes analyses_used / analyses_limit.
 * Re-fetches on mount and provides a manual refetch.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

export interface UsageData {
  analyses_used: number;
  analyses_limit: number;
}

interface UseUsageReturn {
  usage: UsageData | null;
  loading: boolean;
  error: boolean;
  refetch: () => Promise<void>;
}

export function useUsage(): UseUsageReturn {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchUsage = useCallback(async () => {
    try {
      setError(false);
      const response = await api.get<{ usage: UsageData }>('/me');
      const u = response.data?.usage;
      if (u && typeof u.analyses_used === 'number' && typeof u.analyses_limit === 'number') {
        setUsage(u);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { usage, loading, error, refetch: fetchUsage };
}
