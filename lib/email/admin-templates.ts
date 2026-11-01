import { getAppBaseUrl } from '@/lib/routing/env';

const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return 'Not Specified';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Not Specified';
    return d.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Not Specified';
  }
};

const wrapLayout = (title: string, content: string) => {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:#0b0b0f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#f3f4f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0b0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background:#141419;border:1px solid #2a2a35;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:40px 40px 20px;text-align:center;">
          <h2 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:1px;">PROPERTY<span style="color:#a9927d;">LEDGE</span></h2>
        </td></tr>
        <tr><td style="padding:20px 40px 40px;">
          ${content}
        </td></tr>
        <tr><td style="padding:16px 40px;border-top:1px solid #2a2a35;text-align:center;background:#101014;">
          <p style="font-size:11px;color:#4b5563;margin:0;">&copy; ${currentYear} PropertyLedge. Administrator Notification Dispatch.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

export function renderAdminEmailHtml(templateType: string, variables: Record<string, any>): string | null {
  const baseUrl = getAppBaseUrl();

  // 1. User Registration
  if (templateType === 'admin_user_registered') {
    const { userName, userEmail, registeredAt, profileUrl } = variables;
    const userUrl = profileUrl?.startsWith('http') ? profileUrl : `${baseUrl}${profileUrl || '/admin/users'}`;

    return wrapLayout('New User Registration – PropertyLedge', `
      <div style="background:#008F83;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;">New User Registered 👤</h1>
        <p style="margin:0;font-size:14px;color:#e6fffa;opacity:0.95;">A new user has joined the PropertyLedge platform.</p>
      </div>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#141d2b;border:1px solid #1e2d42;border-radius:12px;padding:20px;margin-bottom:24px;">
        <tr><td style="padding-bottom:6px;font-size:11px;color:#00A99D;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">User Name</td></tr>
        <tr><td style="padding-bottom:16px;font-size:16px;color:#ffffff;font-weight:bold;">${userName || 'New Member'}</td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#00A99D;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Email Address</td></tr>
        <tr><td style="padding-bottom:16px;font-size:15px;color:#ffffff;font-family:monospace;">${userEmail || 'N/A'}</td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#00A99D;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Registration Timestamp</td></tr>
        <tr><td style="font-size:14px;color:#d1d5db;">${formatDate(registeredAt || new Date().toISOString())}</td></tr>
      </table>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align:center;margin-bottom:24px;">
        <tr><td>
          <a href="${userUrl}" target="_blank" style="background:#008F83;color:#ffffff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:bold;text-decoration:none;display:inline-block;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(0,143,131,0.3);">View User in Admin Dashboard</a>
        </td></tr>
      </table>
    `);
  }

  // 2. Subscription Initiation
  if (templateType === 'admin_subscription_initiated') {
    const { userName, userEmail, planName, billingInterval, amount, currency, reference, status, initiatedAt, adminUrl } = variables;
    const targetUrl = adminUrl?.startsWith('http') ? adminUrl : `${baseUrl}${adminUrl || '/admin/payments'}`;

    return wrapLayout('New Subscription Attempt – PropertyLedge', `
      <div style="background:#1e3a5a;border:1px solid #2563eb;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;">New Subscription Attempt 💳</h1>
        <p style="margin:0;font-size:14px;color:#bfdbfe;">A customer has initiated checkout. Current status: Pending Payment.</p>
      </div>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#141d2b;border:1px solid #1e2d42;border-radius:12px;padding:20px;margin-bottom:24px;">
        <tr><td style="padding-bottom:6px;font-size:11px;color:#00A99D;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Customer</td></tr>
        <tr><td style="padding-bottom:16px;font-size:15px;color:#ffffff;font-weight:bold;">${userName || 'Customer'} &lt;${userEmail || 'N/A'}&gt;</td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#00A99D;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Selected Plan & Interval</td></tr>
        <tr><td style="padding-bottom:16px;font-size:16px;color:#ffffff;font-weight:bold;">${planName || 'Plan'} (${billingInterval === 'yearly' ? 'Annual' : 'Monthly'})</td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#00A99D;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Expected Amount & Reference</td></tr>
        <tr><td style="padding-bottom:16px;font-size:16px;color:#ffffff;">
          <strong style="font-size:18px;">$${Number(amount || 0).toFixed(2)} ${currency || 'AUD'}</strong> &bull; Ref: <code style="color:#00A99D;font-family:monospace;">${reference || 'N/A'}</code>
        </td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#00A99D;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Status & Timestamp</td></tr>
        <tr><td style="font-size:14px;color:#fbbf24;font-weight:bold;">
          ${status || 'Pending Payment'} &bull; <span style="color:#9ca3af;font-weight:normal;">${formatDate(initiatedAt || new Date().toISOString())}</span>
        </td></tr>
      </table>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align:center;margin-bottom:24px;">
        <tr><td>
          <a href="${targetUrl}" target="_blank" style="background:#2563eb;color:#ffffff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:bold;text-decoration:none;display:inline-block;box-shadow:0 4px 12px rgba(37,99,235,0.3);">View Payments Queue</a>
        </td></tr>
      </table>
    `);
  }

  // 3. Payment Success / Subscription Activated
  if (templateType === 'admin_payment_success') {
    const { userName, userEmail, planName, billingInterval, amount, currency, reference, startDate, endDate, adminUrl } = variables;
    const targetUrl = adminUrl?.startsWith('http') ? adminUrl : `${baseUrl}${adminUrl || '/admin/payments'}`;

    return wrapLayout('New Subscription Activated – PropertyLedge', `
      <div style="background:#064e3b;border:1px solid #10b981;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;">New Subscription Activated 🎉</h1>
        <p style="margin:0;font-size:14px;color:#a7f3d0;">A verified payment has been confirmed and subscription access is active.</p>
      </div>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#141d2b;border:1px solid #1e2d42;border-radius:12px;padding:20px;margin-bottom:24px;">
        <tr><td style="padding-bottom:6px;font-size:11px;color:#00A99D;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Customer</td></tr>
        <tr><td style="padding-bottom:16px;font-size:15px;color:#ffffff;font-weight:bold;">${userName || 'Customer'} &lt;${userEmail || 'N/A'}&gt;</td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#00A99D;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Activated Plan</td></tr>
        <tr><td style="padding-bottom:16px;font-size:16px;color:#10b981;font-weight:bold;">${planName || 'Plan'} (${billingInterval === 'yearly' ? 'Annual Billing' : 'Monthly Billing'})</td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#00A99D;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Amount Paid & Reference</td></tr>
        <tr><td style="padding-bottom:16px;font-size:16px;color:#ffffff;">
          <strong style="font-size:18px;">$${Number(amount || 0).toFixed(2)} ${currency || 'AUD'}</strong> &bull; Ref: <code style="color:#00A99D;font-family:monospace;">${reference || 'N/A'}</code>
        </td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#00A99D;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Subscription Period</td></tr>
        <tr><td style="font-size:14px;color:#d1d5db;">
          Start: <strong>${formatDate(startDate || new Date().toISOString())}</strong> &bull; Renewal/End: <strong>${formatDate(endDate)}</strong>
        </td></tr>
      </table>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align:center;margin-bottom:24px;">
        <tr><td>
          <a href="${targetUrl}" target="_blank" style="background:#10b981;color:#ffffff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:bold;text-decoration:none;display:inline-block;box-shadow:0 4px 12px rgba(16,185,129,0.3);">View Payment in Admin</a>
        </td></tr>
      </table>
    `);
  }

  // 4. Payment Failed
  if (templateType === 'admin_payment_failed') {
    const { userName, userEmail, planName, amount, currency, failureReason, reference, failedAt, adminUrl } = variables;
    const targetUrl = adminUrl?.startsWith('http') ? adminUrl : `${baseUrl}${adminUrl || '/admin/payments'}`;

    return wrapLayout('Payment Failed – PropertyLedge', `
      <div style="background:#451a1a;border:1px solid #ef4444;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;">Payment Failed ⚠️</h1>
        <p style="margin:0;font-size:14px;color:#fca5a5;">A subscription payment has failed or was rejected.</p>
      </div>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#141d2b;border:1px solid #1e2d42;border-radius:12px;padding:20px;margin-bottom:24px;">
        <tr><td style="padding-bottom:6px;font-size:11px;color:#f87171;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Customer</td></tr>
        <tr><td style="padding-bottom:16px;font-size:15px;color:#ffffff;font-weight:bold;">${userName || 'Customer'} &lt;${userEmail || 'N/A'}&gt;</td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#f87171;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Plan & Attempted Amount</td></tr>
        <tr><td style="padding-bottom:16px;font-size:16px;color:#ffffff;">
          ${planName || 'Plan'} &bull; <strong style="color:#ef4444;">$${Number(amount || 0).toFixed(2)} ${currency || 'AUD'}</strong> (Ref: <code>${reference || 'N/A'}</code>)
        </td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#f87171;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Failure Reason</td></tr>
        <tr><td style="padding-bottom:16px;font-size:14px;color:#fecaca;line-height:1.5;">
          ${failureReason || 'Payment rejected or transaction could not be verified.'}
        </td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#f87171;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Timestamp</td></tr>
        <tr><td style="font-size:14px;color:#9ca3af;">${formatDate(failedAt || new Date().toISOString())}</td></tr>
      </table>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align:center;margin-bottom:24px;">
        <tr><td>
          <a href="${targetUrl}" target="_blank" style="background:#ef4444;color:#ffffff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:bold;text-decoration:none;display:inline-block;box-shadow:0 4px 12px rgba(239,68,68,0.3);">Review in Payments Queue</a>
        </td></tr>
      </table>
    `);
  }

  // 5. Subscription Cancelled
  if (templateType === 'admin_subscription_cancelled') {
    const { userName, userEmail, planName, cancellationDate, accessActiveUntil, status, adminUrl } = variables;
    const targetUrl = adminUrl?.startsWith('http') ? adminUrl : `${baseUrl}${adminUrl || '/admin/subscriptions'}`;

    return wrapLayout('Subscription Cancelled – PropertyLedge', `
      <div style="background:#2d1b0d;border:1px solid #f97316;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;">Subscription Cancelled ℹ️</h1>
        <p style="margin:0;font-size:14px;color:#fdba74;">A customer subscription has been cancelled.</p>
      </div>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#141d2b;border:1px solid #1e2d42;border-radius:12px;padding:20px;margin-bottom:24px;">
        <tr><td style="padding-bottom:6px;font-size:11px;color:#f97316;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Customer</td></tr>
        <tr><td style="padding-bottom:16px;font-size:15px;color:#ffffff;font-weight:bold;">${userName || 'Customer'} &lt;${userEmail || 'N/A'}&gt;</td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#f97316;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Cancelled Plan</td></tr>
        <tr><td style="padding-bottom:16px;font-size:16px;color:#ffffff;font-weight:bold;">${planName || 'Plan'}</td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#f97316;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Cancellation Date</td></tr>
        <tr><td style="padding-bottom:16px;font-size:14px;color:#d1d5db;">${formatDate(cancellationDate || new Date().toISOString())}</td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#f97316;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Access Status</td></tr>
        <tr><td style="font-size:14px;color:#fdba74;">
          Status: <strong>${status || 'canceled'}</strong> &bull; Access active until: <strong>${formatDate(accessActiveUntil)}</strong>
        </td></tr>
      </table>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align:center;margin-bottom:24px;">
        <tr><td>
          <a href="${targetUrl}" target="_blank" style="background:#ea580c;color:#ffffff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:bold;text-decoration:none;display:inline-block;box-shadow:0 4px 12px rgba(234,88,12,0.3);">View Subscription Record</a>
        </td></tr>
      </table>
    `);
  }

  // 6. Subscription Expired
  if (templateType === 'admin_subscription_expired') {
    const { userName, userEmail, planName, expirationDate, status, adminUrl } = variables;
    const targetUrl = adminUrl?.startsWith('http') ? adminUrl : `${baseUrl}${adminUrl || '/admin/subscriptions'}`;

    return wrapLayout('Subscription Expired – PropertyLedge', `
      <div style="background:#1e1e24;border:1px solid #6b7280;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;">Subscription Expired ⌛</h1>
        <p style="margin:0;font-size:14px;color:#9ca3af;">A customer subscription has reached the end of its period and is expired.</p>
      </div>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#141d2b;border:1px solid #1e2d42;border-radius:12px;padding:20px;margin-bottom:24px;">
        <tr><td style="padding-bottom:6px;font-size:11px;color:#9ca3af;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Customer</td></tr>
        <tr><td style="padding-bottom:16px;font-size:15px;color:#ffffff;font-weight:bold;">${userName || 'Customer'} &lt;${userEmail || 'N/A'}&gt;</td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#9ca3af;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Expired Plan</td></tr>
        <tr><td style="padding-bottom:16px;font-size:16px;color:#ffffff;font-weight:bold;">${planName || 'Plan'}</td></tr>

        <tr><td style="padding-bottom:6px;font-size:11px;color:#9ca3af;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Expiration Date & Status</td></tr>
        <tr><td style="font-size:14px;color:#d1d5db;">
          Expired: <strong>${formatDate(expirationDate || new Date().toISOString())}</strong> &bull; Status: <strong style="color:#ef4444;">${status || 'expired'}</strong>
        </td></tr>
      </table>

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align:center;margin-bottom:24px;">
        <tr><td>
          <a href="${targetUrl}" target="_blank" style="background:#4b5563;color:#ffffff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:bold;text-decoration:none;display:inline-block;">View Subscription</a>
        </td></tr>
      </table>
    `);
  }

  return null;
}

