-- Script SQL para iniciar Supabase ERP Ikigai Diseño
-- Copia y pega esto en el Editor SQL de tu panel de Supabase y dale a "Run"

-- 1. Tabla de Líneas de Productos
CREATE TABLE IF NOT EXISTS public.lineas (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Productos
CREATE TABLE IF NOT EXISTS public.productos (
    id TEXT PRIMARY KEY,
    linea_id TEXT REFERENCES public.lineas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    precio NUMERIC NOT NULL,
    medidas TEXT,
    material TEXT,
    imagenes TEXT[],
    stock_base INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Pedidos (Órdenes de Compra)
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_serial SERIAL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    estado TEXT DEFAULT 'a) Recibido y gestión de materiales', -- a) Recibido, b) CNC, c) Taller, d) Despacho
    total NUMERIC NOT NULL,
    fecha_ingreso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_estimada_entrega TIMESTAMP WITH TIME ZONE,
    notas TEXT,
    transbank_token TEXT,
    transbank_status TEXT DEFAULT 'PENDING',
    boleta_folio TEXT,
    boleta_error TEXT
);

-- 5. Tabla de Items por Pedido (Carrito)
CREATE TABLE IF NOT EXISTS public.pedido_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE,
    producto_id TEXT REFERENCES public.productos(id) ON DELETE SET NULL,
    cantidad INTEGER DEFAULT 1,
    barniz TEXT,
    precio_unitario NUMERIC NOT NULL
);

-- 6. Tabla de Materiales e Inventario
CREATE TABLE IF NOT EXISTS public.materiales_inventario (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    stock_actual NUMERIC NOT NULL DEFAULT 0,
    unidad TEXT NOT NULL, -- m2, ml, unidades
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabla de Recetas de Muebles (BOM - Bill of Materials)
CREATE TABLE IF NOT EXISTS public.recetas_muebles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id TEXT REFERENCES public.productos(id) ON DELETE CASCADE,
    material_id TEXT REFERENCES public.materiales_inventario(id) ON DELETE CASCADE,
    cantidad_necesaria NUMERIC NOT NULL,
    UNIQUE(producto_id, material_id)
);

-- 8. Tabla de Finanzas
CREATE TABLE IF NOT EXISTS public.finanzas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL, -- ingreso, egreso
    categoria TEXT NOT NULL, -- pago_cliente, compra_material, logistica, mano_obra, otros
    monto NUMERIC NOT NULL,
    descripcion TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Tabla de Configuración General
CREATE TABLE IF NOT EXISTS public.configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
);

-- Habilitar Políticas de Seguridad (RLS)
ALTER TABLE public.lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiales_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas_muebles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso Temporal Abierto (Lectura y Escritura Anónima para desarrollo en Vanilla JS)
CREATE POLICY "Acceso anonimo lineas" ON public.lineas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso anonimo productos" ON public.productos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso anonimo clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso anonimo pedidos" ON public.pedidos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso anonimo pedido_items" ON public.pedido_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso anonimo materiales" ON public.materiales_inventario FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso anonimo recetas" ON public.recetas_muebles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso anonimo finanzas" ON public.finanzas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso anonimo configuracion" ON public.configuracion FOR ALL USING (true) WITH CHECK (true);

-- Insertar Datos Iniciales de Materiales
INSERT INTO public.materiales_inventario (id, nombre, stock_actual, unidad) VALUES
('pino', 'Madera Pino', 50.0, 'm2'),
('roble', 'Madera Roble Seleccionado', 30.0, 'm2'),
('terciado', 'Terciado Mueblista', 40.0, 'm2'),
('barniz_transparente', 'Barniz Poliuretano Transparente', 5000.0, 'ml'),
('barniz_avellano', 'Barniz Poliuretano Avellano', 3000.0, 'ml'),
('eslingas', 'Eslingas de Sujeción', 100.0, 'unidades')
ON CONFLICT (id) DO UPDATE SET stock_actual = EXCLUDED.stock_actual;

-- Insertar Configuración Inicial (Base de días A = 4 días por defecto)
INSERT INTO public.configuracion (clave, valor) VALUES
('dias_base_a', '4')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;

-- Trigger 1: Descuento Automático de Stock Terminado al confirmar compra
CREATE OR REPLACE FUNCTION public.descontar_stock_terminado()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo descuenta stock si había stock positivo disponible.
    UPDATE public.productos
    SET stock_base = GREATEST(stock_base - NEW.cantidad, 0)
    WHERE id = NEW.producto_id AND stock_base > 0;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_descontar_stock ON public.pedido_items;
CREATE TRIGGER trigger_descontar_stock
AFTER INSERT ON public.pedido_items
FOR EACH ROW EXECUTE FUNCTION public.descontar_stock_terminado();

-- Trigger 2: Registro automático en flujo de caja al crear un Pedido
CREATE OR REPLACE FUNCTION public.registrar_finanzas_pedido()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.finanzas (tipo, categoria, monto, descripcion, fecha)
    VALUES ('ingreso', 'pago_cliente', NEW.total, 'Pedido #' || SUBSTRING(NEW.id::text, 1, 8) || ' recibido', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_registrar_finanzas ON public.pedidos;
CREATE TRIGGER trigger_registrar_finanzas
AFTER INSERT ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.registrar_finanzas_pedido();
