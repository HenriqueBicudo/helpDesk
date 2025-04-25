import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type VolumeData = {
  date: string;
  count: number;
};

export function ChartVolume() {
  const { data, isLoading, error } = useQuery<VolumeData[]>({
    queryKey: ['/api/statistics/volume'],
  });
  
  const formattedData = React.useMemo(() => {
    if (!data) return [];
    
    return data.map(item => ({
      date: item.date,
      count: item.count,
      displayDate: format(parseISO(item.date), 'dd/MM', { locale: ptBR })
    }));
  }, [data]);
  
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="px-5 pt-5 border-b border-gray-200">
        <CardTitle className="text-lg font-medium">Volume de Chamados</CardTitle>
      </CardHeader>
      
      <CardContent className="p-5">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <p>Carregando dados...</p>
          </div>
        ) : error ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-red-500">Erro ao carregar dados</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={formattedData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  formatter={(value) => [`${value} chamados`, 'Quantidade']}
                  labelFormatter={(value) => `Data: ${value}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3498db" 
                  fill="#3498db" 
                  fillOpacity={0.3}
                  name="Chamados"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
