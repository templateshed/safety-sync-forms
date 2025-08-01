import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { FileText, LogIn } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Form Management System</h1>
          <p className="text-xl text-muted-foreground">
            Access forms or manage your form collection
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Access a Form
              </CardTitle>
              <CardDescription>
                Have a form code or link? Access it directly without signing in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you have a form URL like /form/ABC123 or a QR code, you can access forms directly.
                Published forms allow anonymous access for quick submissions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LogIn className="h-5 w-5 mr-2" />
                Form Creator Dashboard
              </CardTitle>
              <CardDescription>
                Create, manage, and analyze your forms with advanced features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Sign In to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>
            To access a specific form, use a URL like: /form/YOUR-FORM-CODE
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
