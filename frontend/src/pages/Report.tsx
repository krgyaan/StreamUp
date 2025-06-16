import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReportDashboard from '@/components/ReportDashboard';

const Report = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {jobId ? (
                        <ReportDashboard jobId={jobId} />
                    ) : (
                        <Card className="shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-center text-2xl text-gray-500">
                                    No Job Selected
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-gray-600 mb-4">
                                    Please upload a file first or select a valid job to view report.
                                </p>
                                <Button onClick={() => navigate('/upload')}>
                                    Start New Upload
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Report;
