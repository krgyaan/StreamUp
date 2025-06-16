import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Loader } from 'lucide-react';

interface ReportDashboardProps {
    jobId: string;
}

interface JobProgress {
    stage: 'uploading' | 'parsing' | 'processing' | 'complete' | 'failed';
    progress: number;
    totalRows: number;
    reportRows: number;
    successfulRows: number;
    failedRows: number;
    message: string;
    errors: string[];
}

const ReportDashboard = ({ jobId }: ReportDashboardProps) => {
    const [reportData, setReportData] = useState<JobProgress>({
        stage: 'uploading',
        progress: 0,
        totalRows: 0,
        reportRows: 0,
        successfulRows: 0,
        failedRows: 0,
        message: 'Initializing...',
        errors: []
    });

    useEffect(() => {
        // Simulate progress updates for demo
        const interval = setInterval(() => {
            setReportData(prev => {
                const newReport = Math.min(prev.progress + Math.random() * 10, 100);
                const newReportRows = Math.floor((newReport / 100) * 1000000);

                return {
                    ...prev,
                    progress: newReport,
                    reportRows: newReportRows,
                    successfulRows: Math.floor(newReportRows * 0.95),
                    failedRows: Math.floor(newReportRows * 0.05),
                    totalRows: 1000000,
                    stage: newReport < 25 ? 'uploading' :
                        newReport < 50 ? 'parsing' :
                            newReport < 100 ? 'processing' : 'complete',
                    message: newReport < 25 ? 'Uploading file...' :
                        newReport < 50 ? 'Parsing CSV structure...' :
                            newReport < 100 ? 'Processing rows...' : 'Processing complete!'
                };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [jobId]);

    const getStageIcon = (stage: string) => {
        switch (stage) {
            case 'complete': return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'failed': return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'processing': return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
            default: return <Clock className="h-5 w-5 text-yellow-500" />;
        }
    };

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'complete': return 'bg-green-100 text-green-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'processing': return 'bg-blue-100 text-blue-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Job Progress</h2>
                <Badge className={getStageColor(reportData.stage)}>
                    {getStageIcon(reportData.stage)}
                    <span className="ml-2 capitalize">{reportData.stage}</span>
                </Badge>
            </div>

            {/* Progress Bar */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>{reportData.message}</span>
                        <span className="text-2xl font-bold">{Math.round(reportData.progress)}%</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Progress value={reportData.progress} className="h-4" />
                </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {reportData.totalRows.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Total Rows</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-gray-600">
                            {reportData.reportRows.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Processed</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {reportData.successfulRows.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Successful</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">
                            {reportData.failedRows.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Failed</div>
                    </CardContent>
                </Card>
            </div>

            {/* Job Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Job Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Job ID:</span>
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">{jobId}</code>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Success Rate:</span>
                            <span className="font-medium">
                                {reportData.reportRows > 0 ?
                                    Math.round((reportData.successfulRows / reportData.reportRows) * 100) : 0}%
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReportDashboard;
