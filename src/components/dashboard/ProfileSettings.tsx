
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { User, Save, Mail, Globe } from 'lucide-react';
import { getCustomDomain, setCustomDomain } from '@/utils/domain';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  company: string | null;
}

interface ProfileSettingsProps {
  user: any;
}

export const ProfileSettings = ({ user }: ProfileSettingsProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [customDomain, setCustomDomainState] = useState<string>('');

  useEffect(() => {
    fetchProfile();
    // Load custom domain from localStorage
    const savedDomain = getCustomDomain();
    if (savedDomain) {
      setCustomDomainState(savedDomain);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        // Create a new profile if it doesn't exist
        const newProfile = {
          id: user.id,
          first_name: null,
          last_name: null,
          job_title: null,
          company: null,
        };
        setProfile(newProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: profile.first_name || null,
          last_name: profile.last_name || null,
          job_title: profile.job_title || null,
          company: profile.company || null,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof Profile, value: string) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const sendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-form-notifications', {
        body: {
          email: user.email,
          name: profile?.first_name || user.email,
          subject: 'Test Email - FormFlow Notification System',
          forms: [{
            title: 'Test Form',
            dueType: 'due',
            shortCode: 'TEST123',
            url: `${window.location.origin}/form/TEST123`
          }]
        }
      });

      if (error) throw error;

      toast({
        title: "Test Email Sent",
        description: `Test email sent successfully to ${user.email}`,
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Error",
        description: "Failed to send test email. Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleSaveCustomDomain = () => {
    try {
      setCustomDomain(customDomain);
      toast({
        title: "Success",
        description: customDomain 
          ? `Custom domain set to: ${customDomain}` 
          : "Custom domain cleared. Using default domain.",
      });
    } catch (error) {
      console.error('Error saving custom domain:', error);
      toast({
        title: "Error",
        description: "Failed to save custom domain",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
              <div className="space-y-4">
                <div className="h-10 bg-muted rounded"></div>
                <div className="h-10 bg-muted rounded"></div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <ThemeToggle />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-foreground">
            <User className="h-5 w-5 mr-2" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and job details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">First Name</label>
              <Input
                value={profile?.first_name || ''}
                onChange={(e) => updateField('first_name', e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Last Name</label>
              <Input
                value={profile?.last_name || ''}
                onChange={(e) => updateField('last_name', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Job Title</label>
              <Input
                value={profile?.job_title || ''}
                onChange={(e) => updateField('job_title', e.target.value)}
                placeholder="Enter your job title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Company</label>
              <Input
                value={profile?.company || ''}
                onChange={(e) => updateField('company', e.target.value)}
                placeholder="Enter your company name"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="brand-gradient text-white border-0 hover:shadow-md transition-all duration-200"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            
            <Button 
              onClick={sendTestEmail} 
              disabled={sendingTestEmail}
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Mail className="h-4 w-4 mr-2" />
              {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-foreground">
            <Globe className="h-5 w-5 mr-2" />
            Custom Domain Settings
          </CardTitle>
          <CardDescription>
            Set a custom domain for your form links. Leave empty to use the default domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Custom Domain</label>
            <Input
              value={customDomain}
              onChange={(e) => setCustomDomainState(e.target.value)}
              placeholder="https://yourdomain.com or yourdomain.com"
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              All form links and QR codes will use this domain. Make sure your custom domain is properly configured to point to your Lovable app.
            </p>
          </div>
          
          <Button 
            onClick={handleSaveCustomDomain}
            className="brand-gradient text-white border-0 hover:shadow-md transition-all duration-200"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Custom Domain
          </Button>
        </CardContent>
      </Card>

      <ThemeToggle />
    </div>
  );
};
