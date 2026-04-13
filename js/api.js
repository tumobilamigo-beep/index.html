// js/api.js

// 1. Configuración de Conexión
const SUPABASE_URL = "https://fsdqvdxvhqauyqczgsfb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZHF2ZHh2aHFhdXlxY3pnc2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjU0OTIsImV4cCI6MjA5MDU0MTQ5Mn0.AA7CgSig_lgXSwVeZex-C1AExRKgN1sMuIBnzH9pfqM";

// Inicializamos el cliente (se asume que el script de Supabase ya cargó en el index)
export const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Funciones de Servicio (CRUD)
export const apiService = {
    // Obtener aspirantes en espera
    async getAspirantes() {
        const { data, error } = await _supabase.from('pre_registro').select('*').eq('status', 'pendiente');
        if (error) throw error;
        return data;
    },

    // Eliminar registro de aduana tras decisión
    async eliminarDeAduana(id) {
        return await _supabase.from('pre_registro').delete().eq('id', id);
    },

    // Crear el perfil oficial una vez aprobado
    async crearPerfil(id, nombre, telefono) {
        return await _supabase.from('profiles').insert([{
            id: id,
            full_name: nombre,
            phone: telefono,
            balance_prepago: 0
        }]);
    },

    // Verificar si un usuario existe o está en aduana
    async verificarIdentidad(chatId) {
        const profile = await _supabase.from('profiles').select('*').eq('id', chatId).maybeSingle();
        const preRegistro = await _supabase.from('pre_registro').select('*').eq('id', chatId).maybeSingle();
        return { profile: profile.data, preRegistro: preRegistro.data };
    }
};
