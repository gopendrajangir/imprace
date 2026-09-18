import { useCallback, useRef, useState } from 'react';
import { NitroLocalLLM } from 'react-native-akki-ai';

type LLMStatus = 'idle' | 'generating' | 'finished' | 'failed';
type InterviewStartStatus = 'idle' | 'starting' | 'started' | 'failed';

export const useInterviewLLM = () => {
  const [llmError, setLLMError] = useState<string | null>(null);
  const [llmStatus, setLLMStatus] = useState<LLMStatus>('idle');
  const [sentences, setSentences] = useState<string[]>([]);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [interviewStartStatus, setInterviewStartStatus] =
    useState<InterviewStartStatus>('idle');

  const bufferRef = useRef('');

  const startTimeRef = useRef(0);

  const onChunk = useCallback((chunk: string) => {
    if (bufferRef.current === '') {
      setInferenceTime((Date.now() - startTimeRef.current) / 1000);
    }
    bufferRef.current += chunk;

    const sentenceEnd = /[.!?]+[\s]/;
    let match;
    // test AND slice the SAME thing: bufferRef.current
    while ((match = bufferRef.current.match(sentenceEnd)) !== null) {
      const endIdx = match.index! + match[0].length;
      const sentence = bufferRef.current.slice(0, endIdx).trim();
      bufferRef.current = bufferRef.current.slice(endIdx); // shrink it
      if (sentence) {
        setSentences(s => [...s, sentence]);
      }
    }
  }, []);

  const onComplete = useCallback(() => {
    const leftover = bufferRef.current.trim();
    bufferRef.current = '';
    if (leftover) setSentences(s => [...s, leftover]);
  }, []);

  const talkToAI = useCallback(async (prompt: string) => {
    setLLMError(null);
    setLLMStatus('generating');
    setSentences([]);
    bufferRef.current = '';
    startTimeRef.current = Date.now();

    try {
      await NitroLocalLLM.prompt(prompt, onChunk);
      onComplete();
      setLLMStatus('finished');
    } catch (err: any) {
      setLLMError(err?.message ?? 'Error while generating response');
      setSentences([]);
      setLLMStatus('failed');
    }
  }, []);

  const startInterview = useCallback(
    async (
      userInfo: string,
      systemPrompt: string,
      overwriteSystemPrompt: boolean,
    ) => {
      setInterviewStartStatus('starting');
      setLLMError(null);
      setLLMStatus('generating');
      setSentences([]);
      bufferRef.current = '';
      startTimeRef.current = Date.now();

      try {
        await NitroLocalLLM.startInterview(
          userInfo,
          systemPrompt,
          overwriteSystemPrompt,
          onChunk,
        );
        onComplete();
        setLLMStatus('finished');
        setInterviewStartStatus('started');
      } catch (err: any) {
        setInterviewStartStatus('failed');
        setSentences([]);
        setLLMStatus('failed');
        setLLMError(err?.message ?? 'Error while starting conversation');
      }
    },
    [],
  );

  return {
    sentences,
    llmStatus,
    llmInferenceTime: inferenceTime,
    interviewStartStatus,
    llmError,
    startInterview,
    talkToAI,
  };
};
