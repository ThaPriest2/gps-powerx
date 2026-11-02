import { useCallback, useRef, useState } from 'react';
import { api } from './api';

// Registration wizard state lives at app level so the guided Pitch Demo can drive
// exactly the same flow a user would click through manually.
export function useRegistration(refresh) {
  const [pc, setPc] = useState('');
  const [lookup, setLookupState] = useState({ status: 'idle' });
  const [building, setBuildingState] = useState(null);
  const [asset, setAsset] = useState(null);
  const lookupRef = useRef(null);
  const buildingRef = useRef(null);

  const setBuilding = (b) => {
    buildingRef.current = b;
    setBuildingState(b);
  };
  const setLookup = (l) => {
    lookupRef.current = l;
    setLookupState(l);
  };

  const doLookup = useCallback(async (code) => {
    setLookup({ status: 'loading' });
    setBuilding(null);
    setAsset(null);
    try {
      const r = await api.lookup(code);
      setLookup({ status: 'ok', ...r });
      return r;
    } catch (e) {
      setLookup({ status: 'error', message: e.message, suggestions: e.data?.suggestions });
      throw e;
    }
  }, []);

  const registerBuilding = useCallback(async () => {
    const code = lookupRef.current?.record?.postcode;
    if (!code) throw new Error('Look up a postcode first.');
    const { building: b } = await api.createBuilding(code);
    setBuilding(b);
    await refresh();
    return b;
  }, [refresh]);

  const registerAsset = useCallback(
    async (payload) => {
      const b = buildingRef.current;
      if (!b) throw new Error('Register the building first.');
      const { asset: a } = await api.createAsset({ ...payload, buildingId: b.id });
      setAsset(a);
      await refresh();
      return a;
    },
    [refresh],
  );

  const reset = useCallback(() => {
    setPc('');
    setLookup({ status: 'idle' });
    setBuilding(null);
    setAsset(null);
  }, []);

  return { pc, setPc, lookup, doLookup, building, setBuilding, asset, registerBuilding, registerAsset, reset };
}
