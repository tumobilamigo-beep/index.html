// js/geo.js

export const geoModule = {

    // Estado interno
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
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    precision: Math.round(pos.coords.accuracy) // metros
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
                timeout: 10000,
                maximumAge: 5000
            }
        );
    },

    // Detiene el seguimiento (para cuando el usuario sale del mapa)
    detener() {
        if (this._watchId !== null) {
            navigator.geolocation.clearWatch(this._watchId);
            this._watchId = null;
        }
    },

    // Devuelve la última posición conocida
    getPosicion() {
        return this._posicion;
    },

    // Guarda la ubicación del usuario en su perfil (profiles)
    async guardarUbicacion(supabase, chatId, lat, lng) {
        const { error } = await supabase
            .from('profiles')
            .update({
                ultima_lat: lat,
                ultima_lng: lng,
                ultima_ubicacion_at: new Date().toISOString()
            })
            .eq('id', Number(chatId));

        if (error) console.warn('[Geo] No se pudo guardar ubicación:', error.message);
    }
};
