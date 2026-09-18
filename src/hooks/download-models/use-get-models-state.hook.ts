import { MODEL_IDS } from '@/constants';
import { useEffect, useState } from 'react';
import { NitroDownloadManager } from 'react-native-akki-ai';
import { DownloadState } from 'react-native-akki-ai/lib/specs/DownloadManager.nitro';

export const useGetModelsState = () => {
  const [isFetching, setIsFetching] = useState(false);
  const [modelStates, setModelStates] = useState<DownloadState[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStates = async () => {
    setIsFetching(true);
    setError(null);
    try {
      const result = await NitroDownloadManager.getStates(MODEL_IDS);
      setModelStates(result);
    } catch (err) {
      console.log(err);
      setError('Error while fetching models states');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchStates();
  }, []);

  return {
    isFetching,
    modelStates,
    error,
    fetchStates,
  };
};
