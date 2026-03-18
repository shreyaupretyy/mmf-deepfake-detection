export interface DomainInfo {
  weight: number;
  label: string;
}

export interface FrameResult {
  frame: number;
  fake_probability: number;
}

export interface AnalysisResponse {
  verdict: "AUTHENTIC" | "MANIPULATED" | "INCONCLUSIVE";
  confidence: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  domains: {
    spatial: DomainInfo;
    frequency: DomainInfo;
    semantic: DomainInfo;
  };
  frames_analyzed: number;
  frame_results: FrameResult[];
  processing_time_seconds: number;
}

export interface HistoryEntry {
  id: string;
  filename: string;
  timestamp: string;
  result: AnalysisResponse;
  thumbnailUri?: string;
}
