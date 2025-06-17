import { default as axios } from 'axios';

const baseUrl = 'http://localhost:8080/api';

interface UploadResponse {
  success: boolean;
  fileUploadId: string;
  message: string;
}

interface JobSummary {
  jobId: string;
  status: 'completed' | 'failed' | 'partial';
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  duration: number;
  startTime: string;
  endTime: string;
  errors: Array<{
    row: number;
    error: string;
    data: string;
  }>;
  fileName: string;
  fileSize: number;
}

export const uploadService = {
  uploadFile: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post<UploadResponse>(`${baseUrl}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            onProgress(progress);
          }
        },
      });

      if (response.status !== 200) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Upload endpoint not found. Please check if the server is running and the endpoint is correct.');
        }
        throw new Error(`Upload failed: ${error.response?.data?.message || error.message}`);
      }
      throw new Error('Upload failed: An unexpected error occurred');
    }
  },

  getJobSummary: async (jobId: string): Promise<JobSummary> => {
    try {
      const response = await axios.get<JobSummary>(`${baseUrl}/summary/${jobId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || error.message);
      }
      throw new Error('Failed to fetch job summary');
    }
  },

  getAllJobSummaries: async (): Promise<JobSummary[]> => {
    try {
      const response = await axios.get<JobSummary[]>(`${baseUrl}/jobs`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || error.message);
      }
      throw new Error('Failed to fetch job summaries');
    }
  },
};
