// backend/services/emailService.js
const nodemailer = require('nodemailer');

const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

let transporter = null;

if (hasSmtpConfig) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

/**
 * Envia e-mail transacional via Nodemailer com fallback em console.log
 * @param {Object} options
 * @param {string} options.to - E-mail do destinatário
 * @param {string} options.subject - Assunto do e-mail
 * @param {string} options.text - Corpo em texto simples
 * @param {string} [options.html] - Corpo em HTML (opcional)
 */
async function enviarEmail({ to, subject, text, html }) {
    const from = process.env.EMAIL_FROM || '"Connect Senac" <naoresponda@senac.br>';

    if (transporter) {
        try {
            const info = await transporter.sendMail({
                from,
                to,
                subject,
                text,
                html: html || text
            });
            console.log(`📧 [EMAIL ENVIADO VIA SMTP] ID: ${info.messageId} | Para: ${to}`);
            return { sucesso: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ [FALHA SMTP] Erro ao enviar para ${to}:`, error.message);
            return { sucesso: false, erro: error.message };
        }
    } else {
        // Fallback seguro para ambiente de desenvolvimento/testes
        console.log(`\n📧 [SIMULAÇÃO DE E-MAIL (Sem SMTP configurado)]`);
        console.log(`De: ${from}`);
        console.log(`Para: ${to}`);
        console.log(`Assunto: ${subject}`);
        console.log(`Mensagem:\n${text}\n`);
        return { sucesso: true, simulado: true };
    }
}

module.exports = {
    enviarEmail
};
