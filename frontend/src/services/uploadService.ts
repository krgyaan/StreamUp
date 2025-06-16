import { default as axios } from 'axios';

// Update this to match your backend URL and port
const baseUrl = 'http://localhost:8080/api';

export const uploadService = {
  uploadFile: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const response = await axios.post(`${baseUrl}/upload`, formData, {
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

      // If you're still simulating, keep this
    //   return new Promise((resolve) => {
    //     setTimeout(() => {
    //       if (onProgress) onProgress(100);
    //       resolve(jobId);
    //     }, 2000);
    //   });

      // When ready for production, use this instead:
      return response.data.jobId || jobId;
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
};
