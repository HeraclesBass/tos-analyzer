import { cn } from '@/lib/utils';

type Risk = 'low' | 'medium' | 'high' | 'unknown';

interface RiskBadgeProps {
  risk: Risk;
  className?: string;
  showIcon?: boolean;
}

export const RiskBadge = ({ risk, className, showIcon = false }: RiskBadgeProps) => {
  const config = {
    low: {
      gradient: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald hover:shadow-emerald-xl',
      icon: '✓'
    },
    medium: {
      gradient: 'from-amber-500 to-amber-600',
      shadow: 'shadow-amber hover:shadow-amber-xl',
      icon: '⚠'
    },
    high: {
      gradient: 'from-red-500 to-red-600',
      shadow: 'shadow-red hover:shadow-red-xl',
      icon: '✕'
    },
    unknown: {
      gradient: 'from-slate-600 to-slate-700',
      shadow: 'shadow-slate hover:shadow-slate-xl',
      icon: '?'
    }
  };
  
  const { gradient, shadow, icon } = config[risk];
  
  return (
    <span 
      className={cn(
        'inline-flex items-center space-x-1.5',
        'text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide',
        'bg-gradient-to-r shadow-lg transition-all duration-300',
        'hover:scale-105 hover:shadow-xl',
        gradient,
        shadow,
        className
      )}
    >
      {showIcon && <span className="text-sm">{icon}</span>}
      <span>{risk} RISK</span>
    </span>
  );
};
