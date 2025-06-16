import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, X, FileSpreadsheet, LucideUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/lib/use-toast';
import { uploadService } from '@/services/uploadService';

interface FileUploadProps {
    onUploadStart: (jobId: string) => void;
}

interface FileUploadItem {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'complete' | 'error';
    jobId?: string;
    error?: string;
}

const FileUpload = ({ onUploadStart }: FileUploadProps) => {
    const [files, setFiles] = useState<FileUploadItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const isValidFileType = (fileName: string) => {
        const lowerName = fileName.toLowerCase();
        return lowerName.endsWith('.csv') ||
            lowerName.endsWith('.xlsx') ||
            lowerName.endsWith('.xls');
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const validFiles: File[] = [];
        const errors: string[] = [];

        acceptedFiles.forEach(file => {
            // Validate file type
            if (!isValidFileType(file.name)) {
                errors.push(`${file.name}: Please upload a CSV or Excel file`);
                return;
            }

            // Validate file size (500MB limit)
            if (file.size > 500 * 1024 * 1024) {
                errors.push(`${file.name}: File size must be less than 500MB`);
                return;
            }

            validFiles.push(file);
        });

        if (errors.length > 0) {
            setError(errors.join(', '));
        } else {
            setError(null);
        }

        // Add valid files to the list
        const newFileItems: FileUploadItem[] = validFiles.map(file => ({
            file,
            progress: 0,
            status: 'pending'
        }));

        setFiles(prev => [...prev, ...newFileItems]);

        if (validFiles.length > 0) {
            toast({
                title: "Files Selected",
                description: `${validFiles.length} file(s) ready for upload`,
            });
        }
    }, [toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
        multiple: true,
    });

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        setError(null);

        try {
            // Process files sequentially to avoid overwhelming the system
            for (let i = 0; i < files.length; i++) {
                const fileItem = files[i];

                // Update file status to uploading
                setFiles(prev => prev.map((item, index) =>
                    index === i ? { ...item, status: 'uploading' as const } : item
                ));

                try {
                    const jobId = await uploadService.uploadFile(fileItem.file, (progress) => {
                        setFiles(prev => prev.map((item, index) =>
                            index === i ? { ...item, progress } : item
                        ));
                    });

                    // Update file status to complete
                    setFiles(prev => prev.map((item, index) =>
                        index === i ? { ...item, status: 'complete' as const, jobId } : item
                    ));

                    // Notify parent of first successful upload
                    if (i === 0) {
                        onUploadStart(jobId);
                    }

                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Upload failed';
                    setFiles(prev => prev.map((item, index) =>
                        index === i ? { ...item, status: 'error' as const, error: errorMessage } : item
                    ));
                }
            }

            const completedFiles = files.filter(f => f.status === 'complete').length;
            toast({
                title: "Upload Complete",
                description: `${completedFiles} file(s) processed successfully`,
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
            toast({
                title: "Upload Failed",
                description: "There was an error uploading your files",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileName: string) => {
        const lowerName = fileName.toLowerCase();
        if (lowerName.endsWith('.csv')) {
            return <FileText className="h-5 w-5 text-blue-500" />;
        } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
            return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
        }
        return <FileText className="h-5 w-5 text-gray-500" />;
    };

    const getStatusIcon = (status: FileUploadItem['status']) => {
        switch (status) {
            case 'complete':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'uploading':
                return <Upload className="h-5 w-5 text-blue-500 animate-pulse" />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Drop Zone */}
            <div
                {...getRootProps()}
                className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }
        `}
            >
                <input {...getInputProps()} />

                <div className="space-y-4">
                    <div className="flex justify-center space-x-2">
                        <LucideUpload className="h-16 w-16 text-gray-400" />
                    </div>
                    <div>
                        <p className="text-lg font-medium text-gray-900">
                            {isDragActive ? 'Drop your files here' : 'Drag & drop CSV or Excel files'}
                        </p>
                        <p className="text-sm text-gray-500">
                            or click to browse files | Multiple files supported
                        </p>
                    </div>
                </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-medium text-muted-foreground">({files.length}) Files Selected for Upload</h3>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {files.map((fileItem, index) => (
                            <div key={index} className="border rounded-lg p-2 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center space-x-2">
                                            {getStatusIcon(fileItem.status)}
                                            {getFileIcon(fileItem.file.name)}
                                        </div>
                                        <div className='flex space-x-3'>
                                            <p className="font-medium text-sm">{fileItem.file.name}</p>
                                            <p className="text-xs text-gray-500">
                                                ({formatFileSize(fileItem.file.size)})
                                            </p>
                                        </div>
                                    </div>
                                    {fileItem.status === 'pending' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFile(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                {fileItem.status === 'uploading' && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-gray-600">
                                            <span>Uploading...</span>
                                            <span>{fileItem.progress}%</span>
                                        </div>
                                        <Progress value={fileItem.progress} className="h-2" />
                                    </div>
                                )}

                                {fileItem.status === 'error' && fileItem.error && (
                                    <div className="text-xs text-red-600 mt-2">
                                        Error: {fileItem.error}
                                    </div>
                                )}

                                {fileItem.status === 'complete' && (
                                    <div className="text-xs text-green-600 mt-2">
                                        Upload complete • Job ID: {fileItem.jobId}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Upload Button */}
            <Button
                onClick={handleUpload}
                disabled={files.length === 0 || isUploading}
                className="w-full"
                size="lg"
            >
                {isUploading ? 'Processing Files...' : `Start Processing ${files.length} File(s)`}
            </Button>
        </div>
    );
};

export default FileUpload;
