import nodemailer from 'nodemailer';

const getEmailConfig = () => ({
    user: process.env.GMAIL_USER || 'auvicsolutions@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD,
    baseUrl: process.env.PORTAL_BASE_URL || 'http://localhost:5174'
});

const getTransporter = () => {
    const config = getEmailConfig();
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // STARTTLS
        auth: {
            user: config.user,
            pass: config.pass,
        },
    });
};

// Friendly status label
const STATUS_LABELS = {
    'request': 'Incoming Request',
    'estimation': 'Estimation',
    'in-progress': 'In Progress',
    'review': 'Under Review',
    'invoiced': 'Invoiced',
    'completed': 'Completed',
};

const baseEmailWrapper = (content, user) => `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
  <div style="background: #4f46e5; padding: 32px 40px;">
    <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Auvic Solutions</h1>
    <p style="color: #c7d2fe; margin: 4px 0 0; font-size: 13px;">Project Management Portal</p>
  </div>
  <div style="background: white; padding: 40px;">
    ${content}
  </div>
  <div style="padding: 20px 40px; text-align: center;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">© Auvic Solutions · <a href="mailto:${user}" style="color: #94a3b8;">${user}</a></p>
  </div>
</div>`;

// ── 1. Portal access link ─────────────────────────────────────────────────────
export const sendPortalLink = async (to, jobTitle, token) => {
    const { baseUrl, user } = getEmailConfig();
    const portalUrl = `${baseUrl}/?token=${token}`;

    const html = baseEmailWrapper(`
        <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 20px;">Project Portal Access</h2>
        <p style="color: #475569; margin: 0 0 24px;">Your secure link to track <strong>${jobTitle}</strong> is ready.</p>
        <div style="margin: 32px 0; text-align: center;">
            <a href="${portalUrl}" style="background-color: #4f46e5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">View My Project</a>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">If the button doesn't work, paste this into your browser:</p>
        <p style="color: #6366f1; font-size: 13px; word-break: break-all;">${portalUrl}</p>
    `, user);

    return _send({
        to, subject: `Your Project Portal: ${jobTitle}`, html,
        text: `Access your project portal for "${jobTitle}": ${portalUrl}`
    });
};

// ── 2. Automatic status update notification ───────────────────────────────────
export const sendStatusUpdate = async (to, jobTitle, newStatus, token) => {
    const { baseUrl } = getEmailConfig();
    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    const portalUrl = `${baseUrl}/?token=${token}`;

    const statusColor = {
        'request': '#3b82f6',
        'estimation': '#eab308',
        'in-progress': '#8b5cf6',
        'review': '#f97316',
        'invoiced': '#6366f1',
        'completed': '#22c55e',
    }[newStatus] || '#64748b';

    const html = baseEmailWrapper(`
        <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 20px;">Project Status Update</h2>
        <p style="color: #475569; margin: 0 0 24px;">Your project <strong>${jobTitle}</strong> has moved to a new stage.</p>
        <div style="background: #f8fafc; border-radius: 10px; padding: 20px 24px; margin: 0 0 28px; border-left: 4px solid ${statusColor};">
            <p style="margin: 0 0 4px; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">Current Status</p>
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${statusColor};">${statusLabel}</p>
        </div>
        <div style="margin: 32px 0; text-align: center;">
            <a href="${portalUrl}" style="background-color: #4f46e5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">View Project Details</a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; text-align: center;">This link is private and only works for your account.</p>
    `, getEmailConfig().user);

    return _send({
        to, subject: `Update: "${jobTitle}" is now ${statusLabel}`, html,
        text: `Your project "${jobTitle}" is now: ${statusLabel}. View it here: ${portalUrl}`
    });
};

// ── internal send helper ──────────────────────────────────────────────────────
const _send = async ({ to, subject, html, text }) => {
    const { user, pass } = getEmailConfig();
    if (!pass) {
        console.warn('⚠️  GMAIL_APP_PASSWORD not set in .env — email not sent.');
        return { success: false, error: 'GMAIL_APP_PASSWORD not configured' };
    }
    try {
        const transporter = getTransporter();
        const info = await transporter.sendMail({ from: `"Auvic Solutions" <${user}>`, to, subject, text, html });
        console.log('✅ Email sent:', info.messageId);
        return { success: true };
    } catch (error) {
        console.error('❌ Email error:', error.message, error.stack || '');
        return { success: false, error: error.message };
    }
};
