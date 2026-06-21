-- ============================================================
-- SUPABASE SQL SCHEMA — FMK Sistema de Grados
-- 
-- SOLO se usa Supabase para autenticación y roles de usuario.
-- El resto de los datos (aspirantes, convocatorias, jueces, etc.)
-- se guardan en localStorage del navegador.
-- ============================================================

-- ============================================================
-- TABLA: user_roles
-- Mapea correo electrónico → rol del sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'director', 'juez', 'arbitro', 'medico', 'deportista', 'aspirante')),
    profile_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Política: cualquier usuario autenticado puede leer su propio rol
DROP POLICY IF EXISTS "Leer rol propio" ON public.user_roles;
CREATE POLICY "Leer rol propio" ON public.user_roles
    FOR SELECT USING (true);

-- Política: solo el admin puede insertar/actualizar roles
DROP POLICY IF EXISTS "Admin puede gestionar roles" ON public.user_roles;
CREATE POLICY "Admin puede gestionar roles" ON public.user_roles
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DATOS INICIALES: Roles existentes
-- Ejecuta esto para registrar los correos con sus roles
-- ============================================================

-- Director / Admin
INSERT INTO public.user_roles (email, role) VALUES
    ('lionchan07@gmail.com', 'director')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

-- Juez Regional
INSERT INTO public.user_roles (email, role) VALUES
    ('elviaheredia53@gmail.com', 'juez')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;
