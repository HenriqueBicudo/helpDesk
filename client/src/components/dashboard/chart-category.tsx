import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { translateCategory } from '@/lib/utils';

type CategoryData = {
  category: string;
  count: number;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function ChartCategory() {
  const { data, isLoading, error } = useQuery<CategoryData[]>({
    queryKey: ['/api/statistics/categories'],
  });
  
  const formattedData = React.useMemo(() => {
    if (!data) return [];
    
    return data.map(item => ({
      name: translateCategory(item.category),
      value: item.count
    }));
  }, [data]);
  
  return (
    <Card className="col-span-1">
      <CardHeader className="px-5 pt-5 border-b border-gray-200">
        <CardTitle className="text-lg font-medium">Chamados por Categoria</CardTitle>
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
              <PieChart>
                <Pie
                  data={formattedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {formattedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value} chamados`, 'Quantidade']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
