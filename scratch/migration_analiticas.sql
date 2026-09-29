-- Creación de tabla para analíticas
CREATE TABLE IF NOT EXISTS public.analiticas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    session_id TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    tipo_evento TEXT NOT NULL,
    detalles JSONB
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.analiticas ENABLE ROW LEVEL SECURITY;

-- Permitir a usuarios no autenticados (visitantes de tu web en Netlify) insertar datos
CREATE POLICY "Permitir insercion anonima en analiticas" 
ON public.analiticas FOR INSERT 
TO anon 
WITH CHECK (true);

-- Permitir a usuarios autenticados (tú en el panel de admin) leer los datos
CREATE POLICY "Permitir lectura a autenticados en analiticas" 
ON public.analiticas FOR SELECT 
TO authenticated 
USING (true);

-- Permitir a visitantes públicos ver el total de visitas para el contador
CREATE POLICY "Permitir lectura anonima del contador" 
ON public.analiticas FOR SELECT 
TO anon 
USING (true);
