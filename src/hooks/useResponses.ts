import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ResponseData {
  [key: string]: any;
}

interface UseResponsesReturn {
  responses: ResponseData;
  updateResponse: (fieldId: string, value: any) => void;
  clearResponses: () => void;
  setResponses: (responses: ResponseData) => void;
}

export function useResponses(initialResponses: ResponseData = {}): UseResponsesReturn {
  const [responses, setResponsesState] = useState<ResponseData>(initialResponses);

  const updateResponse = useCallback((fieldId: string, value: any) => {
    setResponsesState(prev => ({
      ...prev,
      [fieldId]: value
    }));
  }, []);

  const clearResponses = useCallback(() => {
    setResponsesState({});
  }, []);

  const setResponses = useCallback((newResponses: ResponseData) => {
    setResponsesState(newResponses);
  }, []);

  return {
    responses,
    updateResponse,
    clearResponses,
    setResponses
  };
}