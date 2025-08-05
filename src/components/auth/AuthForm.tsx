import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { FileText, Sparkles, Users, BarChart3, Mail, Lock } from 'lucide-react';

export const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'form_creator' | 'form_filler'>('form_filler');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `https://forms.ascendrix.co.uk/`,
          },
        });

        if (error) throw error;

        // Create subscriber record with account type
        if (data.user) {
          const { error: subscriberError } = await supabase
            .from('subscribers')
            .insert({
              user_id: data.user.id,
              email: data.user.email!,
              account_type: accountType,
              subscribed: accountType === 'form_creator' ? false : true, // form_creator needs to set up payment
            });

          if (subscriberError) {
            console.error('Error creating subscriber record:', subscriberError);
          }
        }

        toast({
          title: "Success",
          description: accountType === 'form_creator' 
            ? "Account created! Check your email for confirmation. You'll need to set up payment to access form creation features."
            : "Account created! Check your email for confirmation.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {/* Theme Toggle - Top Right Corner */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>
      
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 brand-gradient rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 brand-gradient rounded-2xl shadow-lg mb-4">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-2">
            FormBuilder Pro
          </h1>
          <p className="text-muted-foreground">Create powerful forms with ease</p>
        </div>

        <Card className="backdrop-blur-sm bg-card/80 border-border/20 shadow-xl animate-scale-in">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-foreground">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isSignUp 
                ? 'Join thousands of users creating amazing forms' 
                : 'Sign in to continue to your dashboard'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-primary focus:ring-primary"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>
              
              {isSignUp && (
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-gray-700">Choose Your Plan</Label>
                  <RadioGroup 
                    value={accountType} 
                    onValueChange={(value) => setAccountType(value as 'form_creator' | 'form_filler')}
                    className="space-y-4"
                  >
                    <div className="relative">
                      <div className="flex items-start space-x-3 p-4 border-2 rounded-xl transition-all duration-200 hover:shadow-md bg-white/50 border-gray-200 hover:border-gray-300">
                        <RadioGroupItem value="form_filler" id="form_filler" className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <Users className="h-5 w-5 text-blue-600 mr-2" />
                            <Label htmlFor="form_filler" className="font-semibold text-gray-900">
                              Form Filler
                            </Label>
                            <span className="ml-auto bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">Free</span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            Perfect for participants and respondents. Fill out forms created by others with ease.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="flex items-start space-x-3 p-4 border-2 rounded-xl transition-all duration-200 hover:shadow-md bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300">
                        <RadioGroupItem value="form_creator" id="form_creator" className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <Sparkles className="h-5 w-5 text-blue-600 mr-2" />
                            <Label htmlFor="form_creator" className="font-semibold text-gray-900">
                              Form Creator
                            </Label>
                            <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">Pro</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed mb-2">
                            Create unlimited forms with advanced features, analytics, and customization options.
                          </p>
                          <div className="flex items-center text-xs text-blue-600">
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Advanced Analytics
                          </div>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-12 brand-gradient text-white border-0 font-semibold text-base hover:shadow-lg transition-all duration-200 hover:scale-105" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </Button>
            </form>
            
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors duration-200"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Create one"
                }
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
