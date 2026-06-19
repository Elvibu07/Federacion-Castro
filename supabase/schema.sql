-- ============================================================
-- SQL SCHEMA — FMK Sistema de Grados
-- Para copiar y pegar en el SQL Editor de Supabase
-- ============================================================

-- Habilitar extensión para UUIDs (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: aspirantes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.aspirantes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    club TEXT,
    estilo TEXT,
    avatar_url TEXT,
    current_belt TEXT,
    requested_belt TEXT,
    fecha_ultimo_grado DATE,
    licencias_acumuladas INT DEFAULT 0,
    licencias_consecutivas INT DEFAULT 0,
    status TEXT DEFAULT 'Borrador',
    progress_step INT DEFAULT 1,
    convocatoria_id TEXT,
    via TEXT,
    aval_tecnico TEXT,
    aval_aceptado BOOLEAN DEFAULT false,
    payment_status TEXT DEFAULT 'Unpaid',
    correction_reason TEXT,
    assigned_tribunal_id TEXT,
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- TABLA: convocatorias
-- ============================================================
CREATE TABLE IF NOT EXISTS public.convocatorias (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    fecha DATE NOT NULL,
    sede TEXT,
    grades_admitidos JSONB,
    plazo_ordinario DATE,
    estado TEXT DEFAULT 'Borrador',
    cupo_maximo INT,
    inscritos INT DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- TABLA: judges (Jueces)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.judges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT,
    rank TEXT,
    email TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- TABLA: tribunales
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tribunales (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_main BOOLEAN DEFAULT false,
    convocatoria_id TEXT REFERENCES public.convocatorias(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- TABLA: documentos (Relacionada con aspirantes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aspirante_id TEXT REFERENCES public.aspirantes(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    etiqueta TEXT,
    nombre TEXT,
    estado TEXT DEFAULT 'no_cargado',
    file_url TEXT,
    file_size TEXT,
    motivo_rechazo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- SEGURIDAD (RLS - Row Level Security)
-- ============================================================
-- Por defecto, habilitar RLS para que nadie pueda leer/escribir sin permisos
ALTER TABLE public.aspirantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convocatorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tribunales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE PRUEBA (Permiten todo acceso anónimo para empezar, luego deberás restringirlas)
CREATE POLICY "Permitir todo acceso a aspirantes" ON public.aspirantes FOR ALL USING (true);
CREATE POLICY "Permitir todo acceso a convocatorias" ON public.convocatorias FOR ALL USING (true);
CREATE POLICY "Permitir todo acceso a judges" ON public.judges FOR ALL USING (true);
CREATE POLICY "Permitir todo acceso a tribunales" ON public.tribunales FOR ALL USING (true);
CREATE POLICY "Permitir todo acceso a documentos" ON public.documentos FOR ALL USING (true);
