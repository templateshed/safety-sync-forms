
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Users, Calendar, Settings, Lock, Zap } from 'lucide-react';

type View = 'forms' | 'builder' | 'responses' | 'analytics' | 'settings';

interface ModernSidebarProps {
  currentView: string;
  isFormCreator: boolean;
  onViewChange: (view: View) => void;
  onCreateForm: () => void;
  onRestrictedView: (view: View) => void;
}

export const ModernSidebar = ({ 
  currentView, 
  isFormCreator, 
  onViewChange, 
  onCreateForm, 
  onRestrictedView 
}: ModernSidebarProps) => {
  const navigationItems = [
    {
      id: 'forms' as const,
      label: isFormCreator ? 'My Forms' : 'Available Forms',
      icon: FileText,
      onClick: () => onViewChange('forms'),
      restricted: false,
    },
    {
      id: 'responses' as const,
      label: 'Responses',
      icon: Users,
      onClick: () => isFormCreator ? onViewChange('responses') : onRestrictedView('responses'),
      restricted: !isFormCreator,
    },
    {
      id: 'analytics' as const,
      label: 'Analytics',
      icon: Calendar,
      onClick: () => isFormCreator ? onViewChange('analytics') : onRestrictedView('analytics'),
      restricted: !isFormCreator,
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: Settings,
      onClick: () => onViewChange('settings'),
      restricted: false,
    },
  ];

  return (
    <aside className="w-64 bg-card/60 backdrop-blur-sm shadow-sm h-[calc(100vh-4rem)] border-r border-border">
      <nav className="p-6 space-y-3">
        {/* Create Form Button */}
        <Button
          onClick={onCreateForm}
          disabled={!isFormCreator}
          className={`w-full justify-start mb-6 h-12 text-left font-medium transition-all duration-200 ${
            isFormCreator 
              ? 'brand-gradient hover:shadow-lg hover:scale-105 text-white border-0' 
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {!isFormCreator && <Lock className="h-4 w-4 mr-2" />}
          <Plus className="h-4 w-4 mr-2" />
          Create Form
        </Button>

        {/* Navigation Items */}
        {navigationItems.map((item) => (
          <Button
            key={item.id}
            variant={currentView === item.id ? 'default' : 'ghost'}
            className={`w-full justify-start h-11 font-medium transition-all duration-200 ${
              currentView === item.id 
                ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15' 
                : 'hover:bg-muted/80'
            } ${item.restricted ? 'text-muted-foreground' : ''}`}
            onClick={item.onClick}
            disabled={item.restricted}
          >
            {item.restricted && <Lock className="h-4 w-4 mr-2 opacity-50" />}
            <item.icon className="h-4 w-4 mr-2" />
            {item.label}
          </Button>
        ))}

        {/* Upgrade Prompt for Form Fillers */}
        {!isFormCreator && (
          <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center mb-2">
              <Zap className="h-5 w-5 text-primary mr-2" />
              <h3 className="font-semibold text-foreground">Upgrade to Pro</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              Unlock unlimited forms, advanced analytics, and premium features.
            </p>
            <Button 
              size="sm" 
              className="w-full brand-gradient text-white border-0 hover:shadow-md transition-all duration-200"
              onClick={() => onViewChange('settings')}
            >
              Upgrade Now
            </Button>
          </div>
        )}
      </nav>
    </aside>
  );
};
