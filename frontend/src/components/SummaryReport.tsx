import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Download, FileText, AlertCircle } from 'lucide-react';

interface SummaryReportProps {
    jobId: string;
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

const SummaryReport = ({ jobId }: SummaryReportProps) => {
    const [summary, setSummary] = useState<JobSummary | null>(null);

    useEffect(() => {
        // Simulate loading summary data
        setTimeout(() => {
            setSummary({
                jobId,
                status: 'completed',
                totalRows: 1000000,
                successfulRows: 995000,
                failedRows: 5000,
                duration: 127,
                startTime: new Date(Date.now() - 127000).toISOString(),
                endTime: new Date().toISOString(),
                fileName: 'large_dataset.csv',
                fileSize: 52428800, // 50MB
                errors: [
                    { row: 1500, error: 'Invalid email format', data: 'john@invalid-email' },
                    { row: 2300, error: 'Missing required field: phone', data: 'John Doe,john@email.com,' },
                    { row: 4500, error: 'Invalid date format', data: '2023-13-45' },
                    { row: 7800, error: 'Duplicate entry', data: 'user123@email.com' },
                    { row: 9200, error: 'Invalid phone number', data: '123-invalid-phone' }
                ]
            });
        }, 1000);
    }, [jobId]);

    const formatFileSize = (bytes: number) => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'partial': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="h-4 w-4" />;
            case 'failed': return <XCircle className="h-4 w-4" />;
            case 'partial': return <AlertCircle className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    if (!summary) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Loading summary...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Processing Summary</h2>
                <Badge className={getStatusColor(summary.status)}>
                    {getStatusIcon(summary.status)}
                    <span className="ml-2 capitalize">{summary.status}</span>
                </Badge>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-blue-600">
                            {summary.totalRows.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Total Rows</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-green-600">
                            {summary.successfulRows.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Successful</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-red-600">
                            {summary.failedRows.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Failed</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-purple-600">
                            {Math.round((summary.successfulRows / summary.totalRows) * 100)}%
                        </div>
                        <div className="text-sm text-gray-600">Success Rate</div>
                    </CardContent>
                </Card>
            </div>

            {/* Job Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Job Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Job ID:</span>
                                <code className="bg-gray-100 px-2 py-1 rounded text-sm">{summary.jobId}</code>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">File Name:</span>
                                <span className="font-medium">{summary.fileName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">File Size:</span>
                                <span className="font-medium">{formatFileSize(summary.fileSize)}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Duration:</span>
                                <span className="font-medium">{formatDuration(summary.duration)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Started:</span>
                                <span className="font-medium">{new Date(summary.startTime).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Completed:</span>
                                <span className="font-medium">{new Date(summary.endTime).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Error Details */}
            {summary.errors.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Error Details ({summary.errors.length} errors)</span>
                            <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Export Errors
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {summary.errors.slice(0, 10).map((error, index) => (
                                <div key={index} className="border-l-4 border-red-500 pl-4 py-2 bg-red-50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-red-800">Row {error.row}: {error.error}</p>
                                            <p className="text-sm text-red-600 mt-1">Data: {error.data}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {summary.errors.length > 10 && (
                                <div className="text-center py-2 text-gray-500">
                                    And {summary.errors.length - 10} more errors...
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex gap-4">
                <Button className="flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Download Report</span>
                </Button>
                <Button variant="outline" className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>View Details</span>
                </Button>
            </div>
        </div>
    );
};

export default SummaryReport;
