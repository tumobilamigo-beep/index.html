// js/geo.js

import { _supabase } from './api.js';

const ADMIN_PHONE = "573145210546";

export const geoModule = {

    _watchId: null,
    _posicion: null,

    // Solicita y observa la posición en tiempo real
    iniciar(onSuccess, onError) {
        if (!navigator.geolocation) {
            onError('Tu dispositivo no soporta geolocalización.');
            return;
        }

        this._watchId = navigator.geolocation.watchPosition(
            (pos) => {
                this._posicion = {
                    lat:       pos.coords.latitude,
                    lng:       pos.coords.longitude,
                    precision: Math.round(pos.coords.accuracy)
                };
                onSuccess(this._posicion);
            },
            (err) => {
                const mensajes = {
                    1: 'Permiso de ubicación denegado.',
                    2: 'Ubicación no disponible.',
                    3: 'Tiempo de espera agotado.'
                };
                onError(mensajes[err.code] || 'Error de geolocalización.');
            },
            {
                enableHighAccuracy: true,
                timeout:            10000,
                maximumAge:         5000
            }
        );
    },

    detener() {
        if (this._watchId !== null) {
            navigator.geolocation.clearWatch(this._watchId);
            this._watchId = null;
        }
    },

    getPosicion() {
        return this._posicion;
    },

    async guardarUbicacion(chatId, lat, lng) {
        const { error } = await _supabase
            .from('profiles')
            .update({
                ultima_lat:          lat,
                ultima_lng:          lng,
                ultima_ubicacion_at: new Date().toISOString()
            })
            .eq('id', Number(chatId));

        if (error) console.warn('[Geo] No se pudo guardar ubicación:', error.message);
    },

    // Inicia geo y conecta directamente con la UI
    iniciarConUI(chatId) {
        this.iniciar(
            (pos) => {
                document.getElementById('geo-detecting').style.display = 'none';
                document.getElementById('geo-error').style.display     = 'none';
                document.getElementById('geo-ok').style.display        = 'block';

                document.getElementById('geo-coords').textContent    =
                    `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
                document.getElementById('geo-precision').textContent =
                    `Precisión: ±${pos.precision} m`;

                document.getElementById('btn-solicitar').disabled = false;

                this.guardarUbicacion(chatId, pos.lat, pos.lng);
            },
            (mensaje) => {
                document.getElementById('geo-detecting').style.display = 'none';
                document.getElementById('geo-ok').style.display        = 'none';
                document.getElementById('geo-error').style.display     = 'block';
                document.getElementById('geo-error-msg').textContent   = mensaje;
            }
        );
    },

    // Reinicia geo desde el botón "Reintentar" del HTML
    reintentar(chatId) {
        document.getElementById('geo-error').style.display     = 'none';
        document.getElementById('geo-detecting').style.display = 'block';
        this.detener();
        this.iniciarConUI(chatId);
    }
};
