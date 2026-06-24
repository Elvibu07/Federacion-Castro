-- ============================================================
-- SUPABASE SQL SCHEMA — FMK Sistema de Grados
-- Base de datos relacional para Convocatorias, Tribunales y Aspirantes
-- ============================================================

-- 1️⃣ Borrar tablas antiguas si existen (para limpieza total)
DROP TABLE IF EXISTS public.aspirantes CASCADE;
DROP TABLE IF EXISTS public.tribunales CASCADE;
DROP TABLE IF EXISTS public.convocatorias CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- 2️⃣ Crear tablas principales (Relacionales)

-- Tabla de Convocatorias
CREATE TABLE public.convocatorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    fecha DATE NOT NULL,
    sede TEXT NOT NULL,
    grades_admitidos JSONB NOT NULL DEFAULT '[]'::jsonb,
    plazo_ordinario DATE NOT NULL,
    estado TEXT CHECK (estado IN ('Borrador', 'Abierta', 'Cerrada', 'Finalizada')),
    cupo_maximo INTEGER NOT NULL DEFAULT 50,
    inscritos INTEGER NOT NULL DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabla de Tribunales
CREATE TABLE public.tribunales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    convocatoria_id UUID REFERENCES public.convocatorias(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_main BOOLEAN DEFAULT false,
    fecha DATE,
    data JSONB DEFAULT '{}'::jsonb, -- Guarda los arrays de judges y arbitros
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabla de Aspirantes
CREATE TABLE public.aspirantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    convocatoria_id UUID REFERENCES public.convocatorias(id) ON DELETE SET NULL,
    assigned_tribunal_id UUID REFERENCES public.tribunales(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Borrador',
    data JSONB DEFAULT '{}'::jsonb, -- Guarda documentos, evaluaciones, pagos, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabla de Roles del Personal (Admin, Juez, Director, Médico)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin','director','juez','arbitro','medico')),
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3️⃣ Desactivar Row-Level Security (RLS) para desarrollo
ALTER TABLE public.convocatorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tribunales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.aspirantes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 4️⃣ Roles iniciales de respaldo por defecto (Solo Personal Autorizado)
INSERT INTO public.user_roles (email, role, data) VALUES
    ('lionchan07@gmail.com',         'director', '{"name": "Director General"}'::jsonb),
    ('elviaheredia53@gmail.com',     'juez',     '{"name": "Juez Principal"}'::jsonb),
    ('elvialeonsh@gmail.com',        'admin',    '{"name": "Administrador"}'::jsonb),
    ('paginasusar@gmail.com',        'medico',   '{"name": "Médico"}'::jsonb)
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, data = EXCLUDED.data;
