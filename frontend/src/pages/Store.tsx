import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import { uploadService } from '@/services/uploadService';

interface Job {
    jobId: string;
    status: 'completed' | 'failed' | 'processing' | string;
    fileName: string;
    fileSize: number;
    totalRows: number;
    successfulRows: number;
    failedRows: number;
    startTime: string;
    endTime?: string;
}

const Store = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        uploadService.getAllJobSummaries()
            .then(data => {
                setJobs(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message || 'Failed to load jobs');
                setLoading(false);
            });
    }, []);

    const formatFileSize = (bytes: number) => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    };

    const getStatusIcon = (status: Job['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'failed':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'processing':
                return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
            default:
                return <Clock className="h-5 w-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status: Job['status']) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            case 'processing':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">Job History</h1>
                        <Button onClick={() => navigate('/upload')}>
                            New Upload
                        </Button>
                    </div>
                    {loading && (
                        <div className="text-center text-gray-500 py-8">Loading jobs...</div>
                    )}
                    {error && (
                        <div className="text-center text-red-600 py-8">{error}</div>
                    )}
                    {!loading && !error && (
                        <div className="space-y-4">
                            {jobs.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">No jobs found.</div>
                            ) : jobs.map((job) => (
                                <Card key={job.jobId} className="hover:shadow-lg transition-shadow">
                                    <CardContent>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center space-x-3">
                                                <FileText className="h-6 w-6 text-gray-500" />
                                                <div>
                                                    <h3 className="font-semibold text-lg">{job.fileName}</h3>
                                                    <p className="text-sm text-gray-500">
                                                        {formatFileSize(job.fileSize)} • {job.totalRows.toLocaleString()} rows
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge className={getStatusColor(job.status)}>
                                                {getStatusIcon(job.status)}
                                                <span className="ml-2 capitalize">{job.status}</span>
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                            <div>
                                                <p className="text-sm text-gray-500">Start Time</p>
                                                <p className="font-medium">{formatDate(job.startTime)}</p>
                                            </div>
                                            {job.endTime && (
                                                <div>
                                                    <p className="text-sm text-gray-500">End Time</p>
                                                    <p className="font-medium">{formatDate(job.endTime)}</p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm text-gray-500">Success Rate</p>
                                                <p className="font-medium">
                                                    {job.totalRows > 0
                                                        ? Math.round((job.successfulRows / job.totalRows) * 100)
                                                        : 0}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Failed Rows</p>
                                                <p className="font-medium text-red-600">{job.failedRows}</p>
                                            </div>
                                        </div>

                                        <div className="flex justify-end">
                                            <Button
                                                variant="outline"
                                                onClick={() => navigate(`/summary/${job.jobId}`)}
                                            >
                                                View Details
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Store;
