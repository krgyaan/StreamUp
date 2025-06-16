
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '@/components/FileUpload';
import UploadProgress from '@/components/UploadProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Upload = () => {
    const navigate = useNavigate();
    const [uploadJob, setUploadJob] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleUploadStart = (jobId: string) => {
        setUploadJob(jobId);
        setIsUploading(true);
    };

    const handleUploadComplete = () => {
        setIsUploading(false);
        // Navigate to progress page with job ID
        if (uploadJob) {
            navigate(`/progress/${uploadJob}`);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {!isUploading ? (
                        <Card className="shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-center text-2xl">
                                    Upload Your CSV File
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FileUpload onUploadStart={handleUploadStart} />
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-center text-2xl">
                                    Processing Your Upload
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <UploadProgress
                                    jobId={uploadJob!}
                                    onComplete={handleUploadComplete}
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Upload;
