import React, { useState, useEffect } from 'react';
import { useUI } from '../contexts/UIContext';
import { updatePassword } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface ConfiguracionPerfilFederativoProps {
  roleName: string;
  defaultName?: string;
  defaultEmail?: string;
  onUpdateName?: (newName: string) => void;
}

export default function ConfiguracionPerfilFederativo({ roleName, defaultName, defaultEmail, onUpdateName }: ConfiguracionPerfilFederativoProps) {
  const { showToast } = useUI();
  const [name, setName] = useState(defaultName || '');
  const [originalName, setOriginalName] = useState(defaultName || '');
  const [actualEmail, setActualEmail] = useState(defaultEmail || '');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const fetchedName = user.user_metadata?.full_name || defaultName || '';
        setName(fetchedName);
        setOriginalName(fetchedName);
        setActualEmail(user.email || defaultEmail || '');
        const fetchedAvatar = user.user_metadata?.avatar_url || '';
        setAvatarUrl(fetchedAvatar);
      }
    });
  }, [defaultName, defaultEmail]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData: any = {};
      
      if (name.trim() !== originalName.trim() && name.trim().length > 0) {
        updateData.full_name = name.trim();
      }
      
      if (pendingAvatarFile) {
        const fileExt = pendingAvatarFile.name.split('.').pop();
        const { data: { user } } = await supabase.auth.getUser();
        const filePath = `avatars/${user?.id || 'unknown'}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('fmk_archivos')
          .upload(filePath, pendingAvatarFile, { upsert: true });
          
        if (uploadError) throw new Error('Error al subir la imagen: ' + uploadError.message);
        
        const { data: { publicUrl } } = supabase.storage
          .from('fmk_archivos')
          .getPublicUrl(filePath);
          
        updateData.avatar_url = publicUrl;
      }
      
      if (Object.keys(updateData).length > 0) {
        await supabase.auth.updateUser({
          data: updateData
        });
        
        if (updateData.full_name) {
          setOriginalName(updateData.full_name);
          if (onUpdateName) {
            onUpdateName(updateData.full_name);
          }
        }
        
        setPendingAvatarFile(null);
      }

      if (password.trim()) {
        if (password.length < 6) {
          showToast('La contraseña debe tener al menos 6 caracteres', 'error');
          setIsSaving(false);
          return;
        }
        await updatePassword(password);
      }
      showToast('Perfil actualizado correctamente', 'success');
      setPassword('');
    } catch (err: any) {
      showToast('Error al actualizar el perfil: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPendingAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="max-w-5xl w-full ml-0 mr-auto py-8">
      
      {/* Title Header Section */}
      <div className="mb-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-500/20 dark:to-red-950/10 border border-red-500/20 dark:border-red-500/30 flex items-center justify-center text-red-700 dark:text-red-400 shadow-inner">
          <span className="material-symbols-outlined text-2xl">manage_accounts</span>
        </div>
        <div>
          <h2 className="font-black text-3xl text-stone-800 dark:text-stone-100 tracking-tight">Configuración de Perfil</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Gestiona tus datos personales y credenciales de acceso como <span className="font-bold text-red-700 dark:text-red-400">{roleName}</span>.
          </p>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-[#151515] border border-stone-200/80 dark:border-white/10 rounded-3xl p-8 shadow-xl shadow-stone-200/5 dark:shadow-none animate-in fade-in duration-300">
        
        {/* Avatar Section */}
        <div className="flex items-center gap-6 mb-10 pb-10 border-b border-stone-100 dark:border-white/5">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-red-50 dark:border-red-950/30 bg-stone-100 dark:bg-white/5 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-red-500/40">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-4xl text-stone-300 dark:text-stone-600">person</span>
              )}
            </div>
            <label className="absolute inset-0 bg-black/60 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-300">
              <span className="material-symbols-outlined text-xl mb-1">photo_camera</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Cambiar</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <h3 className="font-black text-xl text-stone-900 dark:text-white mb-1">Foto de Perfil</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 max-w-sm leading-relaxed">
              Sube una foto reciente. Se mostrará en los paneles de la federación. Formatos recomendados: JPG, PNG.
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Full Name field with icon */}
            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                Nombre Completo o Entidad
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg">person</span>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 transition-all dark:text-white"
                />
              </div>
            </div>

            {/* Email field (read-only) with icon */}
            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                Correo Electrónico (Solo Lectura)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400/60 text-lg">mail</span>
                <input 
                  type="text" 
                  value={actualEmail || 'No asignado'}
                  disabled
                  className="w-full pl-12 pr-4 py-3 bg-stone-100/50 dark:bg-white/[0.02] border border-stone-200/50 dark:border-white/5 rounded-xl text-base text-stone-400 dark:text-stone-500 opacity-80 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Account Security with icon inputs */}
          <div className="pt-8 border-t border-stone-100 dark:border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-red-700 dark:text-red-400 text-xl">shield</span>
              <h3 className="font-black text-lg text-stone-900 dark:text-white">Seguridad de la Cuenta</h3>
            </div>
            
            <div className="max-w-md">
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                Nueva Contraseña
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg">lock</span>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Dejar en blanco para mantener actual"
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 transition-all dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button - Brand Gradient Style */}
        <div className="mt-10 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={isSaving || (!password.trim() && name.trim() === originalName.trim() && !pendingAvatarFile)}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-700/20 active:scale-[0.99]"
          >
            {isSaving ? (
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span className="material-symbols-outlined text-xl">save</span>
            )}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
