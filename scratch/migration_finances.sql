-- Añadir columnas a la tabla pedidos para soportar el nuevo esquema financiero
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS costo_variable NUMERIC DEFAULT 0;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'credito'; -- Opciones: 'credito', 'debito'

-- Borrar datos de prueba/viejos en finanzas para empezar de 0 (opcional, ejecutar sólo si estás seguro)
-- DELETE FROM public.finanzas;
