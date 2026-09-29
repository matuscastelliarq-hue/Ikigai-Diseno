-- Migración para añadir soporte de registro de boletas en la tabla pedidos

ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS boleta_folio TEXT,
ADD COLUMN IF NOT EXISTS boleta_error TEXT;
