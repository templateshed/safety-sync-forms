
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Check, Zap, Crown, Star } from 'lucide-react';

interface AccountUpgradeProps {
  userAccountType: string | null;
  onUpgradeSuccess: () => void;
}

export const AccountUpgrade = ({ userAccountType, onUpgradeSuccess }: AccountUpgradeProps) => {
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setUpgrading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      console.log('Starting upgrade process for user:', user.id);

      // Use UPSERT to handle both new and existing subscriber records
      const { error } = await supabase
        .from('subscribers')
        .upsert({ 
          user_id: user.id,
          email: user.email || '',
          account_type: 'form_creator',
          subscribed: true // Set to true for testing purposes
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Supabase error during upgrade:', error);
        throw error;
      }

      console.log('Account upgrade successful');

      toast({
        title: "Account Upgraded! 🎉",
        description: "Your account has been upgraded to Form Creator. You can now create and manage forms.",
      });

      onUpgradeSuccess();
    } catch (error: any) {
      console.error('Error upgrading account:', error);
      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to upgrade account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
    }
  };

  if (userAccountType === 'form_creator') {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50 shadow-lg animate-scale-in">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-green-800 text-xl">Form Creator Pro</CardTitle>
              <CardDescription className="text-green-600">
                You're all set with premium features!
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-green-700">
            <Check className="h-5 w-5" />
            <span className="font-medium">You have access to all form creation and management features.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const features = [
    'Create unlimited custom forms',
    'Advanced analytics and insights',
    'Manage form responses efficiently',
    'Custom branding and themes',
    'Priority customer support',
  ];

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/50 shadow-xl animate-scale-in">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 brand-gradient rounded-xl flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl text-gray-900 flex items-center">
              Upgrade to Form Creator Pro
              <Star className="h-5 w-5 text-yellow-500 ml-2" />
            </CardTitle>
            <CardDescription className="text-gray-600">
              Unlock the full potential of form building and management
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center">
            <Zap className="h-4 w-4 text-blue-600 mr-2" />
            Premium features include:
          </h4>
          <div className="grid gap-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-blue-600" />
                </div>
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white/50 rounded-lg p-4 border border-blue-200/50">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-1">Free Trial</div>
            <div className="text-sm text-gray-600 mb-3">Test all features for development</div>
          </div>
        </div>
        
        <Button 
          onClick={handleUpgrade} 
          disabled={upgrading}
          className="w-full h-12 brand-gradient text-white border-0 font-semibold text-base hover:shadow-lg transition-all duration-200 hover:scale-105"
        >
          {upgrading ? (
            <div className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Upgrading Account...
            </div>
          ) : (
            <div className="flex items-center">
              <Sparkles className="mr-2 h-4 w-4" />
              Start Free Trial
            </div>
          )}
        </Button>
        
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          This is a development environment. In production, this would integrate with Stripe or similar payment processor.
        </p>
      </CardContent>
    </Card>
  );
};
