import { GraduationCap } from 'lucide-react';

interface TraineeBadgeProps {
  className?: string;
}

export function TraineeBadge({ className = '' }: TraineeBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse ${className}`}
      title="This player is using AI coaching assistance"
    >
      <GraduationCap className="w-3 h-3" />
      <span>TRAINEE</span>
    </div>
  );
}
