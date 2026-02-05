-- Verificar se a tabela services existe e sua estrutura
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'services'
ORDER BY 
    ordinal_position;
