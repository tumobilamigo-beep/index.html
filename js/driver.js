// js/driver.js

import { _supabase } from './api.js';

export const driverModule = {

    _canalViajes: null,

    // Obtiene el perfil completo del conductor desde la DB
    async getPerfil(chatId) {
        const { data, error } = await _supabase
            .from('profiles')
            .select(`
                full_name,
                role,
                is_available_driver,
                habilitado_por_admin,
                soat_vencimiento,
                tecnomecanica_vencimiento,
                licencia_vencimiento,
                balance_prepago
            `)
            .eq('id', Number(chatId))
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    // Activa o desactiva disponibilidad del conductor
    async toggleDisponibilidad(chatId, disponible) {
        const { error } = await _supabase
            .from('profiles')
            .update({ is_available_driver: disponible })
            .eq('id', Number(chatId));

        if (error) throw error;
        return disponible;
    },

    // Obtiene viajes pendientes (status = 'buscando')
    async getViajesPendientes() {
        const { data, error } = await _supabase
            .from('trip_requests')
            .select('*')
            .eq('status', 'buscando')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // Conductor acepta un viaje
    async aceptarViaje(viajeId, driverId) {
        const { data, error } = await _supabase
            .from('trip_requests')
            .update({
                driver_id:  Number(driverId),
                status:     'aceptado',
                updated_at: new Date().toISOString()
            })
            .eq('id', viajeId)
            .eq('status', 'buscando') // evita doble aceptación
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Conductor marca viaje como completado
    async completarViaje(viajeId) {
        const { error } = await _supabase
            .from('trip_requests')
            .update({
                status:     'completado',
                updated_at: new Date().toISOString()
            })
            .eq('id', viajeId);

        if (error) throw error;
    },

    // Escucha en tiempo real los viajes nuevos disponibles
    suscribirViajesNuevos(onChange) {
        this._canalViajes = _supabase
            .channel('viajes-disponibles')
            .on('postgres_changes', {
                event:  'INSERT',
                schema: 'public',
                table:  'trip_requests'
            }, (payload) => onChange(payload.new))
            .subscribe();

        return this._canalViajes;
    },

    desuscribir() {
        if (this._canalViajes) {
            this._canalViajes.unsubscribe();
            this._canalViajes = null;
        }
    },

    // Verifica si los documentos del conductor están vigentes
    verificarDocumentos(perfil) {
        const hoy = new Date();
        const checks = {
            soat:          new Date(perfil.soat_vencimiento)          > hoy,
            tecnomecanica: new Date(perfil.tecnomecanica_vencimiento) > hoy,
            licencia:      new Date(perfil.licencia_vencimiento)      > hoy
        };
        checks.todoVigente = checks.soat && checks.tecnomecanica && checks.licencia;
        return checks;
    }
};
