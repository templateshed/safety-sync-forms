
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg dark:bg-gray-900/80 dark:border-gray-700/20">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-gray-900 dark:text-gray-100">
          {theme === 'light' ? (
            <Sun className="h-5 w-5 mr-2" />
          ) : (
            <Moon className="h-5 w-5 mr-2" />
          )}
          Theme Settings
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Choose between light and dark mode
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Dark Mode
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
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
