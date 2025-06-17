import { useState, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import { useWebSocket } from '@/lib/useWebSocket';

interface UploadProgressProps {
    jobId: string;
    onComplete: () => void;
}

interface ProgressData {
    stage: 'uploading' | 'chunking' | 'processing' | 'complete' | 'error';
    progress: number; // Overall progress percentage
    totalRows: number;
    processedRows: number;
    errorCount: number;
    message: string;
}

const UploadProgress = ({ jobId, onComplete }: UploadProgressProps) => {
    const [progressData, setProgressData] = useState<ProgressData>({
        stage: 'uploading',
        progress: 0,
        totalRows: 0,
        processedRows: 0,
        errorCount: 0,
        message: 'Initializing upload...'
    });
    const [totalChunks, setTotalChunks] = useState(0);

    const handleMessage = useCallback((message: any) => {
        if (message.fileUploadId === jobId) {
            if (message.type === 'file_progress') {
                setProgressData(prev => ({
                    ...prev,
                    stage: message.data.status === 'chunked' ? 'chunking' : prev.stage,
                    totalRows: message.data.totalRows || prev.totalRows,
                    message: message.data.message || prev.message,
                }));
                if (message.data.totalChunks) {
                    setTotalChunks(message.data.totalChunks);
                }
            } else if (message.type === 'chunk_progress') {
                const currentProgress = totalChunks > 0 ? ((message.data.chunkIndex + 1) / totalChunks) * 100 : 0;
                setProgressData(prev => ({
                    ...prev,
                    stage: 'chunking',
                    progress: currentProgress,
                    totalRows: message.data.totalRows || prev.totalRows,
                    message: `Chunking file: ${message.data.chunkIndex + 1}/${message.data.totalChunks} chunks processed`,
                }));
                setTotalChunks(message.data.totalChunks);
            } else if (message.type === 'processing_progress') {
                setProgressData(prev => {
                    const newProcessedRows = (prev.processedRows || 0) + (message.data.processedRows || 0);
                    const newErrorCount = (prev.errorCount || 0) + (message.data.errorCount || 0);
                    const totalProcessed = newProcessedRows + newErrorCount;
                    const overallProgress = prev.totalRows > 0 ? (totalProcessed / prev.totalRows) * 100 : 0;

                    if (prev.stage === 'chunking') {
                        // Once data processing messages start, switch to processing stage
                        return {
                            ...prev,
                            stage: 'processing',
                            processedRows: newProcessedRows,
                            errorCount: newErrorCount,
                            progress: overallProgress,
                            message: `Processing data: ${newProcessedRows} rows processed, ${newErrorCount} errors`
                        };
                    } else {
                        return {
                            ...prev,
                            processedRows: newProcessedRows,
                            errorCount: newErrorCount,
                            progress: overallProgress,
                            message: `Processing data: ${newProcessedRows} rows processed, ${newErrorCount} errors`
                        };
                    }
                });

                if (message.data.processedRows + message.data.errorCount >= progressData.totalRows && progressData.totalRows > 0) {
                    // If all rows are processed, mark as complete
                    setProgressData(prev => ({ ...prev, stage: 'complete', progress: 100, message: 'Processing complete!' }));
                    setTimeout(onComplete, 2000);
                }
            } else if (message.type === 'error') {
                setProgressData(prev => ({
                    ...prev,
                    stage: 'error',
                    message: message.data.message || 'An error occurred',
                }));
            }
        }
    }, [jobId, onComplete]);

    const { isConnected } = useWebSocket({
        fileUploadId: jobId,
        onMessage: handleMessage
    });

    const getStageText = (stage: string) => {
        switch (stage) {
            case 'uploading': return 'Uploading file...';
            case 'chunking': return 'Chunking file...';
            case 'processing': return 'Processing rows...';
            case 'complete': return 'Processing complete!';
            case 'error': return 'Error processing file';
            default: return 'Processing...';
        }
    };

    const getStageIcon = (stage: string) => {
        if (stage === 'complete') {
            return <CheckCircle className="h-6 w-6 text-green-500" />;
        } else if (stage === 'error') {
            return <XCircle className="h-6 w-6 text-red-500" />;
        }
        return <Loader className="h-6 w-6 text-blue-500 animate-spin" />;
    };

    return (
        <div className="space-y-6">
            {/* Connection Status */}
            {!isConnected && (
                <div className="text-sm text-amber-600 text-center">
                    Connecting to real-time updates...
                </div>
            )}

            {/* Progress Header */}
            <div className="flex items-center justify-center space-x-3">
                {getStageIcon(progressData.stage)}
                <h3 className="text-xl font-semibold">
                    {getStageText(progressData.stage)}
                </h3>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                    <span>{progressData.message}</span>
                    <span>{Math.round(progressData.progress)}%</span>
                </div>
                <Progress value={progressData.progress} className="h-3" />
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {(progressData.totalRows ?? 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Total Rows</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {(progressData.processedRows ?? 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Processed</div>
                    </CardContent>
                </Card>
            </div>

            {/* Processing Rate */}
            {progressData.stage === 'processing' && (progressData.processedRows ?? 0) > 0 && (
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center">
                            <div className="text-lg font-medium">
                                Processing Rate
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                                ~{Math.round((progressData.processedRows ?? 0) / 60)} rows/second
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Completion Message */}
            {progressData.stage === 'complete' && (
                <div className="text-center text-green-600 font-medium">
                    Your data has been successfully processed! Redirecting to results...
                </div>
            )}
        </div>
    );
};

export default UploadProgress;
