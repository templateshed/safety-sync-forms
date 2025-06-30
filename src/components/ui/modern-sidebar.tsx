
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Users, Calendar, Settings, Lock, Zap } from 'lucide-react';

interface ModernSidebarProps {
  currentView: string;
  isFormCreator: boolean;
  onViewChange: (view: string) => void;
  onCreateForm: () => void;
  onRestrictedView: (view: string) => void;
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
      id: 'forms',
      label: isFormCreator ? 'My Forms' : 'Available Forms',
      icon: FileText,
      onClick: () => onViewChange('forms'),
      restricted: false,
    },
    {
      id: 'responses',
      label: 'Responses',
      icon: Users,
      onClick: () => isFormCreator ? onViewChange('responses') : onRestrictedView('responses'),
      restricted: !isFormCreator,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: Calendar,
      onClick: () => isFormCreator ? onViewChange('analytics') : onRestrictedView('analytics'),
      restricted: !isFormCreator,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      onClick: () => onViewChange('settings'),
      restricted: false,
    },
  ];

  return (
    <aside className="w-64 bg-white/60 backdrop-blur-sm shadow-sm h-[calc(100vh-4rem)] border-r border-gray-200/50">
      <nav className="p-6 space-y-3">
        {/* Create Form Button */}
        <Button
          onClick={onCreateForm}
          disabled={!isFormCreator}
          className={`w-full justify-start mb-6 h-12 text-left font-medium transition-all duration-200 ${
            isFormCreator 
              ? 'brand-gradient hover:shadow-lg hover:scale-105 text-white border-0' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
                : 'hover:bg-gray-100/80'
            } ${item.restricted ? 'text-gray-400' : ''}`}
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
          <div className="mt-8 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
            <div className="flex items-center mb-2">
              <Zap className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="font-semibold text-blue-900">Upgrade to Pro</h3>
            </div>
            <p className="text-sm text-blue-700 mb-3 leading-relaxed">
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
