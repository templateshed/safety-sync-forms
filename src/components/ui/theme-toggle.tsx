
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-foreground">
          {theme === 'light' ? (
            <Sun className="h-5 w-5 mr-2" />
          ) : (
            <Moon className="h-5 w-5 mr-2" />
          )}
          Theme Settings
        </CardTitle>
        <CardDescription>
          Choose between light and dark mode
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Dark Mode
            </p>
            <p className="text-sm text-muted-foreground">
              Switch between light and dark theme
            </p>
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
            aria-label="Toggle dark mode"
          />
        </div>
      </CardContent>
    </Card>
  );
};
