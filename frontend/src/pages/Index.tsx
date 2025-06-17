import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: Upload,
            title: "Drag & Drop Upload",
        },
        {
            icon: Zap,
            title: "Real-time Processing",
        },
        {
            icon: FileText,
            title: "Batch Processing",
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Hero Section */}
            <section className="py-20">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-5xl font-bold text-gray-900 mb-6">
                        <span className="text-blue-600">Stream</span> smarter.
                        <span className="text-blue-600"> Up</span>load faster.
                    </h2>
                    <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        Upload and process large CSV files with real-time progress tracking.
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Button
                            onClick={() => navigate('/upload')}
                            size="lg"
                            className="bg-primary hover:bg-primary/70 text-lg px-8 py-3 cursor-pointer"
                        >
                            Get Started
                        </Button>
                        <Button
                            onClick={() => navigate('/store')}
                            size="lg"
                            variant="outline"
                            className="text-lg px-8 py-3 cursor-pointer"
                        >
                            View Jobs
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-16">
                <div className="container mx-auto px-4">
                    <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
                        Powerful Features for Large-Scale Data Processing
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader className="text-center">
                                    <feature.icon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Index;
