
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Sign Up' : 'Sign In'}</CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Create an account to get started' 
              : 'Sign in to your account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {isSignUp && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Account Type</Label>
                <RadioGroup 
                  value={accountType} 
                  onValueChange={(value) => setAccountType(value as 'form_creator' | 'form_filler')}
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="form_filler" id="form_filler" className="mt-1" />
                    <div className="space-y-1">
                      <Label htmlFor="form_filler" className="font-medium">
                        Form Filler (Free)
                      </Label>
                      <p className="text-sm text-gray-600">
                        Fill out forms created by others. Perfect for respondents and participants.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="form_creator" id="form_creator" className="mt-1" />
                    <div className="space-y-1">
                      <Label htmlFor="form_creator" className="font-medium">
                        Form Creator (Paid)
                      </Label>
                      <p className="text-sm text-gray-600">
                        Create, customize, and manage your own forms. Includes analytics and advanced features.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
