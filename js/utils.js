// js/utils.js

// Constante del admin (espeja la Edge Function para validaciones en frontend)
const ADMIN_PHONE = "573145210546";

export const telegramUtils = {

    // Lee los parámetros ?id=&phone= enviados por la Edge Function
    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            chatId: params.get("id"),
            phone: params.get("phone")
        };
    },

    // Verifica si el teléfono actual es el del Soberano
    esSoberano(phone) {
        return phone === ADMIN_PHONE;
    },

    // Formatea moneda colombiana: 15000 → "$15.000"
    formatCOP(value) {
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0
        }).format(value);
    },

    // Formatea fecha ISO a legible: "2026-04-13" → "13 de abr. de 2026"
    formatDate(isoString) {
        return new Date(isoString).toLocaleDateString("es-CO", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    },

    // Muestra u oculta el spinner global
    setLoading(show) {
        const spinner = document.getElementById("loading-spinner");
        if (spinner) spinner.style.display = show ? "flex" : "none";
    },

    // Feedback visual de error sin alert()
    showError(mensaje) {
        console.error("[SamyApp]", mensaje);
        const el = document.getElementById("msg-feedback");
        if (el) {
            el.textContent = mensaje;
            el.style.color = "var(--danger)";
            el.style.display = "block";
        }
    },

    // Feedback visual de éxito
    showSuccess(mensaje) {
        const el = document.getElementById("msg-feedback");
        if (el) {
            el.textContent = mensaje;
            el.style.color = "var(--success)";
            el.style.display = "block";
        }
    }
};
