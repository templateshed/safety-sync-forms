
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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
        title: "Account Upgraded!",
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
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">Form Creator Account</CardTitle>
          <CardDescription className="text-green-600">
            Your account is already upgraded to Form Creator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-green-700">
            You have access to all form creation and management features.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upgrade to Form Creator</CardTitle>
        <CardDescription>
          Unlock the ability to create forms, view analytics, and manage responses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">Form Creator features include:</h4>
          <ul className="text-sm text-gray-600 space-y-1 ml-4">
            <li>• Create unlimited custom forms</li>
            <li>• View detailed analytics and reports</li>
            <li>• Manage form responses</li>
            <li>• Advanced form settings and branding</li>
            <li>• Schedule forms for automatic sending</li>
          </ul>
        </div>
        
        <Button 
          onClick={handleUpgrade} 
          disabled={upgrading}
          className="w-full"
        >
          {upgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {upgrading ? 'Upgrading...' : 'Upgrade Account for Testing'}
        </Button>
        
        <p className="text-xs text-gray-500 text-center">
          This is a test upgrade. In production, this would integrate with a payment system.
        </p>
      </CardContent>
    </Card>
  );
};
