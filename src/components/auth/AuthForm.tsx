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
            emailRedirectTo: `${window.location.origin}/`,
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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Theme Toggle - Top Right Corner */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>
      
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 brand-gradient rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-r from-brand-purple to-primary rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float delay-1000"></div>
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 brand-gradient rounded-3xl shadow-lg mb-6 animate-glow">
            <FileText className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-3">
            FormBuilder Pro
          </h1>
          <p className="text-muted-foreground text-lg">Create powerful forms with ease</p>
        </div>

        <Card className="glass-effect border-border/30 shadow-xl animate-scale-in">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-foreground">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
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
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary transition-colors"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary transition-colors"
                  />
                </div>
              </div>
              
              {isSignUp && (
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-foreground">Choose Your Plan</Label>
                  <RadioGroup 
                    value={accountType} 
                    onValueChange={(value) => setAccountType(value as 'form_creator' | 'form_filler')}
                    className="space-y-4"
                  >
                    <div className="relative">
                      <div className="flex items-start space-x-3 p-4 border-2 rounded-xl transition-all duration-200 hover:shadow-md bg-card/50 border-border hover:border-accent-foreground/20 card-interactive">
                        <RadioGroupItem value="form_filler" id="form_filler" className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <Users className="h-5 w-5 text-primary mr-2" />
                            <Label htmlFor="form_filler" className="font-semibold text-foreground">
                              Form Filler
                            </Label>
                            <span className="ml-auto bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-medium px-2 py-1 rounded-full">Free</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Perfect for participants and respondents. Fill out forms created by others with ease.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="flex items-start space-x-3 p-4 border-2 rounded-xl transition-all duration-200 hover:shadow-md brand-gradient-subtle border-primary/20 hover:border-primary/30 card-interactive">
                        <RadioGroupItem value="form_creator" id="form_creator" className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <Sparkles className="h-5 w-5 text-primary mr-2" />
                            <Label htmlFor="form_creator" className="font-semibold text-foreground">
                              Form Creator
                            </Label>
                            <span className="ml-auto bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full border border-primary/20">Pro</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                            Create unlimited forms with advanced features, analytics, and customization options.
                          </p>
                          <div className="flex items-center text-xs text-primary">
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
                variant="gradient"
                size="lg"
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 loading-spinner border-primary-foreground/30 border-t-primary-foreground mr-2"></div>
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
