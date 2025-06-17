import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/lib/useWebSocket';
import { FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ProcessingProgressProps {
    fileUploadId: string;
    fileName: string;
}

interface ProcessingState {
    status: 'processing' | 'chunked' | 'error';
    totalRows?: number;
    totalChunks?: number;
    currentChunk?: number;
    message?: string;
    error?: string;
}

export const ProcessingProgress = ({ fileUploadId, fileName }: ProcessingProgressProps) => {
    const [processingState, setProcessingState] = useState<ProcessingState>({
        status: 'processing'
    });

    const { isConnected, error: wsError } = useWebSocket({
        fileUploadId,
        onMessage: (message) => {
            switch (message.type) {
                case 'file_progress':
                    setProcessingState(prev => ({
                        ...prev,
                        ...message.data
                    }));
                    break;
                case 'chunk_progress':
                    setProcessingState(prev => ({
                        ...prev,
                        currentChunk: message.data.chunkIndex + 1,
                        totalChunks: message.data.totalChunks,
                        totalRows: message.data.totalRows
                    }));
                    break;
                case 'error':
                    setProcessingState(prev => ({
                        ...prev,
                        status: 'error',
                        error: message.data.message
                    }));
                    break;
            }
        }
    });

    const getProgressPercentage = () => {
        if (processingState.status === 'chunked') return 100;
        if (processingState.currentChunk && processingState.totalChunks) {
            return Math.round((processingState.currentChunk / processingState.totalChunks) * 100);
        }
        return 0;
    };

    const getStatusIcon = () => {
        switch (processingState.status) {
            case 'chunked':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
        }
    };

    const getStatusBadge = () => {
        switch (processingState.status) {
            case 'chunked':
                return <Badge variant="default" className="bg-green-100 text-green-800">Complete</Badge>;
            case 'error':
                return <Badge variant="destructive">Error</Badge>;
            default:
                return <Badge variant="secondary">Processing</Badge>;
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5" />
                        <span className="truncate">{fileName}</span>
                    </div>
                    {getStatusBadge()}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                    {getStatusIcon()}
                    <span className="text-sm text-gray-600">
                        {processingState.message || 'Processing file...'}
                    </span>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{getProgressPercentage()}%</span>
                    </div>
                    <Progress value={getProgressPercentage()} className="h-2" />
                </div>

                {processingState.totalRows && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Total Rows:</span>
                            <span className="ml-2 font-medium">{processingState.totalRows.toLocaleString()}</span>
                        </div>
                        {processingState.currentChunk && processingState.totalChunks && (
                            <div>
                                <span className="text-gray-500">Chunks:</span>
                                <span className="ml-2 font-medium">
                                    {processingState.currentChunk} / {processingState.totalChunks}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {processingState.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        Error: {processingState.error}
                    </div>
                )}

                {wsError && (
                    <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                        WebSocket connection issue. Progress updates may be delayed.
                    </div>
                )}

                <div className="text-xs text-gray-400">
                    File ID: {fileUploadId}
                </div>
            </CardContent>
        </Card>
    );
};
