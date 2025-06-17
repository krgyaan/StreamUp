import { useState, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Loader, CheckCircle } from 'lucide-react';
import { useWebSocket } from '@/lib/useWebSocket';

interface UploadProgressProps {
    jobId: string;
    onComplete: () => void;
}

interface ProgressData {
    stage: 'uploading' | 'parsing' | 'processing' | 'complete';
    progress: number;
    totalRows: number;
    processedRows: number;
    message: string;
}

const UploadProgress = ({ jobId, onComplete }: UploadProgressProps) => {
    const [progressData, setProgressData] = useState<ProgressData>({
        stage: 'uploading',
        progress: 0,
        totalRows: 0,
        processedRows: 0,
        message: 'Initializing upload...'
    });

    const handleMessage = useCallback((message: any) => {
        if (message.fileUploadId === jobId) {
            setProgressData(message.data);
            if (message.data.stage === 'complete') {
                setTimeout(onComplete, 2000);
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
            case 'parsing': return 'Parsing CSV structure...';
            case 'processing': return 'Processing rows...';
            case 'complete': return 'Processing complete!';
            default: return 'Processing...';
        }
    };

    const getStageIcon = (stage: string) => {
        if (stage === 'complete') {
            return <CheckCircle className="h-6 w-6 text-green-500" />;
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
