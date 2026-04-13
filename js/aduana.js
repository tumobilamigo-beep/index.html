// js/aduana.js
import { apiService } from './api.js';

export const aduanaModule = {
    // Función para llenar el modal con las fotos y datos del aspirante
    abrirDetalle(user) {
        // 1. Inyectar imágenes en el modal
        document.getElementById('view-foto-perfil').src = user.foto_perfil_url || '';
        document.getElementById('view-cedula-f').src = user.cedula_frontal_url || '';
        document.getElementById('view-cedula-t').src = user.cedula_trasera_url || '';

        // 2. Configurar los botones de acción del Soberano
        const btnAprobar = document.getElementById('btn-aprobar-final');
        const btnRechazar = document.getElementById('btn-rechazar-final');

        // Usamos funciones flecha para mantener el contexto de 'this'
        btnAprobar.onclick = () => this.ejecutarAprobacion(user);
        btnRechazar.onclick = () => this.ejecutarRechazo(user.id);
        
        // 3. Mostrar el modal (CSS flex)
        document.getElementById('modal-review').style.display = 'flex';
    },

    async ejecutarAprobacion(user) {
        if(!confirm(`¿Soberano, confirma el ingreso de ${user.full_name}?`)) return;
        
        try {
            // Llamamos al servicio pasando los datos limpios
            // IMPORTANTE: Aquí ajustamos para que coincida con lo que pusimos en api.js
            await apiService.crearPerfil(user.id, user.full_name, user.phone);
            
            // Si el perfil se crea, limpiamos la Aduana
            await apiService.eliminarDeAduana(user.id);
            
            alert("¡Ciudadano aprobado y registrado!");
            location.reload(); 
        } catch (error) {
            console.error("Error en aprobación:", error);
            alert("Hubo un error al procesar la aprobación.");
        }
    },

    async ejecutarRechazo(id) {
        if(!confirm("¿Soberano, desea rechazar definitivamente este ingreso?")) return;
        
        try {
            await apiService.eliminarDeAduana(id);
            location.reload();
        } catch (error) {
            alert("Error al eliminar registro.");
        }
    }
};
