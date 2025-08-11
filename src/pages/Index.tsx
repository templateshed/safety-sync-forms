
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { FileText, LogIn } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 brand-gradient rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float delay-1000"></div>
      </div>
      
      <div className="relative container mx-auto px-4 py-20">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 brand-gradient rounded-3xl shadow-lg mb-6 animate-glow">
            <FileText className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-6 gradient-text">
            Form Management System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Create powerful forms with ease or access existing forms quickly and securely
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          <Card className="glass-effect card-hover animate-slide-up group">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl">
                <div className="p-2 bg-primary/10 rounded-lg mr-3 group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                Access a Form
              </CardTitle>
              <CardDescription className="text-base">
                Have a form code or link? Access it directly without signing in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you have a form URL like /form/ABC123 or a QR code, you can access forms directly.
                Published forms allow anonymous access for quick submissions.
              </p>
              <div className="pt-2">
                <div className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  No account required
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect card-hover animate-slide-up delay-100 group">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-xl">
                <div className="p-2 bg-primary/10 rounded-lg mr-3 group-hover:bg-primary/20 transition-colors">
                  <LogIn className="h-6 w-6 text-primary" />
                </div>
                Form Creator Dashboard
              </CardTitle>
              <CardDescription className="text-base">
                Create, manage, and analyze your forms with advanced features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Access the full suite of form creation tools, analytics, and management features to build professional forms.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full sm:w-auto brand-gradient hover:shadow-lg transition-all duration-300 hover:scale-105"
                  size="lg"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In to Dashboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/pricing')}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  View Pricing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16 animate-fade-in delay-200">
          <div className="inline-flex items-center px-4 py-2 bg-muted/50 rounded-full border border-border/50">
            <span className="text-sm text-muted-foreground">
              💡 To access a specific form, use a URL like: <code className="mx-1 px-2 py-1 bg-background rounded text-xs font-mono">/form/YOUR-FORM-CODE</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
