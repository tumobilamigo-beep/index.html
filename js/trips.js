// js/trips.js

import { _supabase } from './api.js';
import { telegramUtils } from './utils.js';

const PRECIO_POR_KM = 2500;

export const tripsModule = {

    _viajeActivo: null,
    _canalViaje:  null,

    // ─── DB ───────────────────────────────────────────────────────

    async solicitarViaje({ clientId, originLat, originLng, originRef, destName, destLat, destLng }) {
        const { data, error } = await _supabase
            .from('trip_requests')
            .insert([{
                client_id:                Number(clientId),
                origin_lat:               originLat,
                origin_lng:               originLng,
                origin_address_reference: originRef || 'Mi ubicación actual',
                destination_name:         destName  || 'Destino',
                dest_lat:                 destLat   || null,
                dest_lng:                 destLng   || null,
                price_cop:                this._calcularPrecio(originLat, originLng, destLat, destLng),
                status:                   'buscando'
            }])
            .select()
            .single();

        if (error) throw error;
        this._viajeActivo = data;
        return data;
    },

    async cancelarViaje(viajeId) {
        const { error } = await _supabase
            .from('trip_requests')
            .update({
                status:     'cancelado',
                updated_at: new Date().toISOString()
            })
            .eq('id', viajeId);

        if (error) throw error;
        this._viajeActivo = null;
    },

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

    // Historial de viajes del cliente
    async getHistorial(clientId, limite = 10) {
        const { data, error } = await _supabase
            .from('trip_requests')
            .select('*')
            .eq('client_id', Number(clientId))
            .in('status', ['completado', 'cancelado'])
            .order('created_at', { ascending: false })
            .limit(limite);

        if (error) throw error;
        return data || [];
    },

    // ─── REALTIME ─────────────────────────────────────────────────

    suscribirViaje(viajeId, onChange) {
        this._canalViaje = _supabase
            .channel(`viaje-${viajeId}`)
            .on('postgres_changes', {
                event:  'UPDATE',
                schema: 'public',
                table:  'trip_requests',
                filter: `id=eq.${viajeId}`
            }, (payload) => onChange(payload.new))
            .subscribe();

        return this._canalViaje;
    },

    desuscribir() {
        if (this._canalViaje) {
            this._canalViaje.unsubscribe();
            this._canalViaje = null;
        }
    },

    // ─── UI ───────────────────────────────────────────────────────

    // Inicia el flujo completo de solicitud
    async iniciarSolicitud(chatId, destino, pos) {
        try {
            telegramUtils.setLoading(true);

            const viaje = await this.solicitarViaje({
                clientId:  chatId,
                originLat: pos.lat,
                originLng: pos.lng,
                originRef: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
                destName:  destino
            });

            this._renderViajeActivo(viaje);

            this.suscribirViaje(viaje.id, (viajeActualizado) => {
                this._actualizarEstado(viajeActualizado);
            });

        } catch (error) {
            telegramUtils.showError('Error al solicitar: ' + error.message);
        } finally {
            telegramUtils.setLoading(false);
        }
    },

    async iniciarCancelacion() {
        if (!this._viajeActivo) return;
        if (!confirm('¿Cancelar el viaje?')) return;

        try {
            await this.cancelarViaje(this._viajeActivo.id);
            this.desuscribir();
            this._renderPanelSolicitar();
        } catch (error) {
            telegramUtils.showError('Error al cancelar: ' + error.message);
        }
    },

    // Verifica si hay un viaje activo al cargar la app
    async verificarViajeActivo(chatId) {
        const viaje = await this.getViajeActivo(chatId);
        if (viaje) {
            this._renderViajeActivo(viaje);
            this.suscribirViaje(viaje.id, (v) => this._actualizarEstado(v));
        }
        return viaje;
    },

    // ─── UI PRIVADO ───────────────────────────────────────────────

    _renderViajeActivo(viaje) {
        document.getElementById('panel-solicitar').style.display    = 'none';
        document.getElementById('panel-viaje-activo').style.display = 'block';
        document.getElementById('viaje-precio').textContent =
            `Precio estimado: ${telegramUtils.formatCOP(viaje.price_cop)}`;
        this._actualizarEstado(viaje);
    },

    _renderPanelSolicitar() {
        document.getElementById('panel-viaje-activo').style.display = 'none';
        document.getElementById('panel-solicitar').style.display    = 'block';
        document.getElementById('input-destino').value = '';
    },

    _actualizarEstado(viaje) {
        const textos = {
            buscando:   'Buscando conductor...',
            aceptado:   '¡Conductor encontrado! En camino.',
            en_camino:  'El conductor está cerca.',
            completado: '¡Viaje completado!',
            cancelado:  'Viaje cancelado.'
        };

        document.getElementById('viaje-status-text').textContent =
            textos[viaje.status] || viaje.status;

        if (viaje.status === 'completado' || viaje.status === 'cancelado') {
            setTimeout(() => {
                this.desuscribir();
                this._renderPanelSolicitar();
            }, 2000);
        }
    },

    // ─── CÁLCULO ──────────────────────────────────────────────────

    _calcularDistanciaKm(lat1, lng1, lat2, lng2) {
        if (!lat2 || !lng2) return 3;
        const R  = 6371;
        const dL = (lat2 - lat1) * Math.PI / 180;
        const dG = (lng2 - lng1) * Math.PI / 180;
        const a  = Math.sin(dL/2) ** 2 +
                   Math.cos(lat1 * Math.PI / 180) *
                   Math.cos(lat2 * Math.PI / 180) *
                   Math.sin(dG/2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    _calcularPrecio(lat1, lng1, lat2, lng2) {
        const km = this._calcularDistanciaKm(lat1, lng1, lat2, lng2);
        return Math.round(km * PRECIO_POR_KM / 100) * 100;
    }
};
