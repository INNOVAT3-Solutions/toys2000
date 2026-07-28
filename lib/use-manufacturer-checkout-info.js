'use client';

import { useEffect, useMemo, useState } from 'react';

async function fetchCheckoutInfo(manufacturerID) {
  const res = await fetch(`/api/markettime/manufacturer/${manufacturerID}/checkout-info`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Could not load vendor rules');
  }
  return {
    minimumOrderAmount: data.minimumOrderAmount ?? 0,
    minimumReorderAmount: data.minimumReorderAmount ?? 0,
    promotions: data.promotions ?? [],
  };
}

/** Live MarketTime minimums + promotions for one manufacturer. */
export function useManufacturerCheckoutInfo(manufacturerID) {
  const [info, setInfo] = useState({
    minimumOrderAmount: 0,
    minimumReorderAmount: 0,
    promotions: [],
    loading: Boolean(manufacturerID),
    error: null,
  });

  useEffect(() => {
    if (!manufacturerID) {
      setInfo({
        minimumOrderAmount: 0,
        minimumReorderAmount: 0,
        promotions: [],
        loading: false,
        error: null,
      });
      return;
    }

    let cancelled = false;
    setInfo((prev) => ({ ...prev, loading: true, error: null }));

    fetchCheckoutInfo(manufacturerID)
      .then((data) => {
        if (cancelled) return;
        setInfo({ ...data, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setInfo({
          minimumOrderAmount: 0,
          minimumReorderAmount: 0,
          promotions: [],
          loading: false,
          error: err.message,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [manufacturerID]);

  return info;
}

/** Batch fetch for cart page (one vendor group per manufacturer). */
export function useManufacturerCheckoutInfos(manufacturerIDs = []) {
  const key = useMemo(
    () => [...new Set(manufacturerIDs.filter(Boolean))].sort().join(','),
    [manufacturerIDs]
  );

  const [byId, setById] = useState({});
  const [loading, setLoading] = useState(Boolean(key));
  const [error, setError] = useState(null);

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (!ids.length) {
      setById({});
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(
      ids.map(async (id) => {
        try {
          const data = await fetchCheckoutInfo(id);
          return [id, data];
        } catch (err) {
          return [id, {
            minimumOrderAmount: 0,
            minimumReorderAmount: 0,
            promotions: [],
            error: err.message,
          }];
        }
      })
    )
      .then((entries) => {
        if (cancelled) return;
        setById(Object.fromEntries(entries));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { byId, loading, error };
}
