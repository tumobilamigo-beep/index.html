// js/driver.js

import { _supabase } from './api.js';
import { telegramUtils } from './utils.js';

export const driverModule = {

    _canalViajes: null,

    // ─── DB ───────────────────────────────────────────────────────

    async getPerfil(chatId) {
        const { data, error } = await _supabase
            .from('profiles')
            .select(`
                full_name, role, is_available_driver, habilitado_por_admin,
                soat_vencimiento, tecnomecanica_vencimiento,
                licencia_vencimiento, balance_prepago
            `)
            .eq('id', Number(chatId))
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async toggleDisponibilidad(chatId, disponible) {
        const { error } = await _supabase
            .from('profiles')
            .update({ is_available_driver: disponible })
            .eq('id', Number(chatId));
        if (error) throw error;
        return disponible;
    },

    async getViajesPendientes() {
        const { data, error } = await _supabase
            .from('trip_requests')
            .select('*')
            .eq('status', 'buscando')
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async aceptarViaje(viajeId, driverId) {
        const { data, error } = await _supabase
            .from('trip_requests')
            .update({
                driver_id:  Number(driverId),
                status:     'aceptado',
                updated_at: new Date().toISOString()
            })
            .eq('id', viajeId)
            .eq('status', 'buscando')
            .select()
            .single();
        if (error) throw error;
        return data;
    },

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

    // ─── REALTIME ─────────────────────────────────────────────────

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

    // ─── DOCUMENTOS ───────────────────────────────────────────────

    verificarDocumentos(perfil) {
        const hoy = new Date();
        const checks = {
            soat:          new Date(perfil.soat_vencimiento)          > hoy,
            tecnomecanica: new Date(perfil.tecnomecanica_vencimiento) > hoy,
            licencia:      new Date(perfil.licencia_vencimiento)      > hoy
        };
        checks.todoVigente = checks.soat && checks.tecnomecanica && checks.licencia;
        return checks;
    },

    // ─── UI ───────────────────────────────────────────────────────

    // Inicializa toda la pantalla del conductor
    async iniciarPanelDriver(chatId) {
        const perfil = await this.getPerfil(chatId);
        if (!perfil) return;

        this._renderDocumentos(perfil);
        this._renderEstado(perfil.is_available_driver);

        // Configura el toggle
        const toggle = document.getElementById('toggle-disponible');
        toggle.checked = perfil.is_available_driver;
        toggle.onchange = (e) => this.onToggleDisponibilidad(chatId, e.target.checked);

        if (perfil.is_available_driver) {
            this.suscribirViajesNuevos((viaje) => this._renderViajes([viaje], true));
            await this._cargarViajes();
        }
    },

    async onToggleDisponibilidad(chatId, disponible) {
        try {
            await this.toggleDisponibilidad(chatId, disponible);
            this._renderEstado(disponible);

            if (disponible) {
                this.suscribirViajesNuevos((viaje) => this._renderViajes([viaje], true));
                await this._cargarViajes();
            } else {
                this.desuscribir();
            }
        } catch (error) {
            telegramUtils.showError('Error al cambiar disponibilidad.');
        }
    },

    async onAceptarViaje(viajeId, chatId) {
        if (!confirm('¿Aceptar este viaje?')) return;
        try {
            await this.aceptarViaje(viajeId, chatId);
            await this._cargarViajes();
            telegramUtils.showSuccess('¡Viaje aceptado!');
        } catch (error) {
            telegramUtils.showError('El viaje ya fue tomado.');
        }
    },

    // ─── UI PRIVADO ───────────────────────────────────────────────

    _renderEstado(disponible) {
        const el = document.getElementById('driver-status-text');
        el.textContent = disponible ? 'Disponible' : 'No disponible';
        el.style.color = disponible ? 'var(--success)' : 'var(--danger)';
    },

    _renderDocumentos(perfil) {
        const docs = this.verificarDocumentos(perfil);
        const icon = (ok) => ok
            ? `<i class="fas fa-circle-check" style="color:var(--success);"></i>`
            : `<i class="fas fa-circle-xmark" style="color:var(--danger);"></i>`;

        document.getElementById('doc-soat').innerHTML =
            `${icon(docs.soat)} SOAT — vence: ${telegramUtils.formatDate(perfil.soat_vencimiento)}`;
        document.getElementById('doc-tecnomecanica').innerHTML =
            `${icon(docs.tecnomecanica)} Tecnomecánica — vence: ${telegramUtils.formatDate(perfil.tecnomecanica_vencimiento)}`;
        document.getElementById('doc-licencia').innerHTML =
            `${icon(docs.licencia)} Licencia — vence: ${telegramUtils.formatDate(perfil.licencia_vencimiento)}`;
    },

    async _cargarViajes() {
        const viajes = await this.getViajesPendientes();
        this._renderViajes(viajes, false);
    },

    _renderViajes(viajes, agregar) {
        const lista  = document.getElementById('lista-viajes-driver');
        const sinMsg = document.getElementById('driver-sin-viajes');
        const badge  = document.getElementById('driver-badge');

        const html = viajes.map(v => `
            <div class="card" style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <p style="margin:0; font-weight:700;">
                            <i class="fas fa-location-dot" style="color:var(--primary);"></i>
                            ${v.destination_name}
                        </p>
                        <p style="margin:4px 0 0; font-size:12px; color:#64748b;">
                            Origen: ${v.origin_address_reference}
                        </p>
                        <p style="margin:4px 0 0; font-size:13px; font-weight:700; color:var(--success);">
                            ${telegramUtils.formatCOP(v.price_cop)}
                        </p>
                    </div>
                    <button onclick="driverModule.onAceptarViaje('${v.id}', ${v.client_id})"
                        class="btn-main" style="width:auto; padding:10px 16px; font-size:13px;">
                        Tomar
                    </button>
                </div>
            </div>
        `).join('');

        agregar ? lista.insertAdjacentHTML('afterbegin', html) : lista.innerHTML = html;

        const total = lista.querySelectorAll('.card').length;
        badge.textContent    = total;
        badge.style.display  = total > 0 ? 'inline' : 'none';
        sinMsg.style.display = total > 0 ? 'none'   : 'block';
    }
};
