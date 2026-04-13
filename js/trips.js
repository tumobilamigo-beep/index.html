// js/trips.js

import { _supabase } from './api.js';

// Tarifa base del sistema
const PRECIO_POR_KM = 1900; // COP por kilómetro

export const tripsModule = {

    _viajeActivo: null,

    // Crea la solicitud de viaje en la DB
    async solicitarViaje({ clientId, originLat, originLng, originRef, destName, destLat, destLng }) {
        const { data, error } = await _supabase
            .from('trip_requests')
            .insert([{
                client_id:               Number(clientId),
                origin_lat:              originLat,
                origin_lng:              originLng,
                origin_address_reference: originRef  || 'Mi ubicación actual',
                destination_name:        destName    || 'Destino',
                dest_lat:                destLat,
                dest_lng:                destLng,
                price_cop:               this._calcularPrecio(originLat, originLng, destLat, destLng),
                status:                  'buscando'
            }])
            .select()
            .single();

        if (error) throw error;
        this._viajeActivo = data;
        return data;
    },

    // Cancela el viaje activo
    async cancelarViaje(viajeId) {
        const { error } = await _supabase
            .from('trip_requests')
            .update({ status: 'cancelado', updated_at: new Date().toISOString() })
            .eq('id', viajeId);

        if (error) throw error;
        this._viajeActivo = null;
    },

    // Consulta si el cliente ya tiene un viaje activo
    async getViajeActivo(clientId) {
        const { data } = await _supabase
            .from('trip_requests')
            .select('*')
            .eq('client_id', Number(clientId))
            .in('status', ['buscando', 'aceptado', 'en_camino'])
            .maybeSingle();

        this._viajeActivo = data;
        return data;
    },

    // Escucha cambios en tiempo real del viaje (Realtime)
    suscribirViaje(viajeId, onChange) {
        return _supabase
            .channel(`viaje-${viajeId}`)
            .on('postgres_changes', {
                event:  'UPDATE',
                schema: 'public',
                table:  'trip_requests',
                filter: `id=eq.${viajeId}`
            }, (payload) => onChange(payload.new))
            .subscribe();
    },

    // Fórmula Haversine — distancia en km entre dos coordenadas
    _calcularDistanciaKm(lat1, lng1, lat2, lng2) {
        if (!lat2 || !lng2) return 3; // fallback 3km si no hay destino
        const R  = 6371;
        const dL = (lat2 - lat1) * Math.PI / 180;
        const dG = (lng2 - lng1) * Math.PI / 180;
        const a  = Math.sin(dL/2) ** 2 +
                   Math.cos(lat1 * Math.PI/180) *
                   Math.cos(lat2 * Math.PI/180) *
                   Math.sin(dG/2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    // Calcula precio estimado
    _calcularPrecio(lat1, lng1, lat2, lng2) {
        const km = this._calcularDistanciaKm(lat1, lng1, lat2, lng2);
        return Math.round(km * PRECIO_POR_KM / 100) * 100; // redondea a $100
    }
};
