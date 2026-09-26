export interface CandidateInfo {
  userInfo: string;
  systemPrompt: string;
  overwriteSystemPrompt: boolean;
}

export type RootStackParamsList = {
  Splash: undefined;
  ModelsDownload: undefined;
  InterviewStarter: undefined;
  Interview: {
    candidateInfo: CandidateInfo;
  };
  ModelsLoader: {
    candidateInfo: CandidateInfo;
  };
  InterviewAnalysis: undefined;
  Profiler: undefined;
};
