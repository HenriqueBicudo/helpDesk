import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type MetricCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: {
    value: number;
    timeframe: string;
    isPositive?: boolean;
  };
  iconBgColor?: string;
  iconColor?: string;
};

export function MetricCard({
  title,
  value,
  icon,
  change,
  iconBgColor = "bg-primary/10",
  iconColor = "text-primary"
}: MetricCardProps) {
  const isPositive = change?.isPositive === undefined ? change?.value > 0 : change.isPositive;
  
  return (
    <Card className="p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h2 className="text-3xl font-bold text-gray-800">{value}</h2>
        </div>
        <div className={cn("p-3 rounded-full", iconBgColor)}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
      
      {change && (
        <div className="flex items-center mt-4">
          <span className={cn(
            "flex items-center text-sm",
            isPositive ? "text-green-600" : "text-red-600"
          )}>
            {isPositive ? (
              <ArrowUp className="h-4 w-4 mr-0.5" />
            ) : (
              <ArrowDown className="h-4 w-4 mr-0.5" />
            )}
            <span>{Math.abs(change.value)}%</span>
          </span>
          <span className="text-gray-500 text-sm ml-2">desde {change.timeframe}</span>
        </div>
      )}
    </Card>
  );
}
