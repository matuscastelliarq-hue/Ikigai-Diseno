-- Script de Migración: Agregar número de orden correlativo

ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS orden_serial SERIAL;

-- Opcional: Si quieres que empiece desde el número 1000 en lugar del 1
ALTER SEQUENCE public.pedidos_orden_serial_seq RESTART WITH 1000;
