export interface ClusterResult {
  school: string;
  municipality: string;
  cluster_id: number;
  cluster_name: string;
  cluster_color?: string;
  model_used: string;
  success: boolean;
  error?: string;
}

export interface ClusterInfo {
  id: number;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface BatchResponse {
  results: ClusterResult[];
  summary: {
    total_schools: number;
    successful_predictions: number;
    failed_predictions: number;
    processing_time_seconds: number;
    clusters: ClusterInfo[];
    dominant_cluster: number;
    dominant_cluster_name: string;
    model_used: string;
    performance: string;
  };
}
