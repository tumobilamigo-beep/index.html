// Utilidades y Telegram, función de envío de mensajes y formateo.
export const telegramUtils = {
    async enviarMensaje(id, msj) {
        const token = "7547466540:AAEYm7Z9_NIdl-O2R0Gsh8pQitE26U_5A4A";
        try {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ chat_id: id, text: msj, parse_mode: 'Markdown' })
            });
        } catch(e) { console.error("Error en Telegram Notification"); }
    }
};
