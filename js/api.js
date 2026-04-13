// js/api.js

const SUPABASE_URL = "https://fsdqvdxvhqauyqczgsfb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzZHF2ZHh2aHFhdXlxY3pnc2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjU0OTIsImV4cCI6MjA5MDU0MTQ5Mn0.AA7CgSig_lgXSwVeZex-C1AExRKgN1sMuIBnzH9pfqM";

export const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const apiService = {

    async getAspirantes() {
        const { data, error } = await _supabase.from('pre_registro').select('*').eq('status', 'pendiente');
        if (error) throw error;
        return data;
    },

    async eliminarDeAduana(id) {
        return await _supabase.from('pre_registro').delete().eq('id', id);
    },

    async crearPerfil(id, nombre, telefono) {
        return await _supabase.from('profiles').insert([{
            id: id,
            full_name: nombre,
            phone: telefono,
            balance_prepago: 0
        }]);
    },

    async verificarIdentidad(chatId) {
        const profile = await _supabase.from('profiles').select('*').eq('id', chatId).maybeSingle();
        const preRegistro = await _supabase.from('pre_registro').select('*').eq('id', chatId).maybeSingle();
        return { profile: profile.data, preRegistro: preRegistro.data };
    }
};
