import { getAppBaseUrl } from '@/lib/routing/env';

const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return 'Just now';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Just now';
    return d.toLocaleDateString('en-AU', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Australia/Sydney',
    }) + ' AEST';
  } catch {
    return 'Just now';
  }
};

const getInitials = (name?: string): string => {
  if (!name || !name.trim()) return 'PL';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const wrapLayout = (title: string, content: string) => {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0d14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0d14;padding:40px 16px;">
    <tr><td align="center">
      <!-- Main Container Card -->
      <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#13151f;border:1px solid #232738;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
        
        <!-- Top Accent Bar -->
        <tr><td height="4" style="background:linear-gradient(90deg, #008F83 0%, #10b981 50%, #0284c7 100%);"></td></tr>
        
        <!-- Header -->
        <tr>
          <td style="padding:36px 40px 24px;text-align:center;border-bottom:1px solid #1c202e;">
            <div style="font-size:24px;font-weight:900;letter-spacing:1.5px;color:#ffffff;text-transform:uppercase;">
              PROPERTY<span style="color:#00A99D;">LEDGE</span>
            </div>
            <div style="margin-top:6px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1.2px;text-transform:uppercase;">
              Platform Administration Alert
            </div>
          </td>
        </tr>

        <!-- Body Content -->
        <tr>
          <td style="padding:32px 40px 40px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;background:#0d0f17;border-top:1px solid #1c202e;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#64748b;font-weight:500;">
              Sent to PropertyLedge Platform Administrators &bull; Resend Notification Engine
            </p>
            <p style="margin:0;font-size:11px;color:#475569;">
              &copy; ${currentYear} PropertyLedge Australia. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

export function renderAdminEmailHtml(templateType: string, variables: Record<string, any>): string | null {
  const baseUrl = getAppBaseUrl();

  // 1. User Registration (Full User Details + Modern Executive Card)
  if (templateType === 'admin_user_registered') {
    const {
      userName,
      userEmail,
      userId,
      userPhone,
      authProvider,
      isEmailConfirmed,
      registeredAt,
      profileUrl,
    } = variables;

    const userUrl = profileUrl?.startsWith('http') ? profileUrl : `${baseUrl}${profileUrl || (userId ? `/admin/users/${userId}` : '/admin/users')}`;
    const initials = getInitials(userName);
    const formattedDate = formatDate(registeredAt || new Date().toISOString());

    return wrapLayout('New User Registration – PropertyLedge', `
      <!-- Hero Banner -->
      <div style="background:linear-gradient(135deg, rgba(0,143,131,0.2) 0%, rgba(16,185,129,0.08) 100%);border:1px solid rgba(0,169,157,0.3);border-radius:16px;padding:24px;text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;width:56px;height:56px;line-height:56px;border-radius:50%;background:#008F83;color:#ffffff;font-weight:900;font-size:20px;letter-spacing:1px;margin-bottom:12px;box-shadow:0 4px 16px rgba(0,143,131,0.4);">
          ${initials}
        </div>
        <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#ffffff;">New User Joined PropertyLedge 🎉</h1>
        <p style="margin:0;font-size:13.5px;color:#a7f3d0;line-height:1.5;">
          A new customer has successfully registered an account on the platform.
        </p>
      </div>

      <!-- Section Title -->
      <div style="margin-bottom:12px;font-size:11px;font-weight:800;color:#00A99D;letter-spacing:1px;text-transform:uppercase;">
        User Profile & Registration Details
      </div>

      <!-- Details Card -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#181b27;border:1px solid #232738;border-radius:14px;overflow:hidden;margin-bottom:28px;">
        <!-- Full Name -->
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #232738;color:#94a3b8;font-size:13px;width:38%;">Full Name</td>
          <td style="padding:14px 20px;border-bottom:1px solid #232738;color:#ffffff;font-size:14px;font-weight:700;text-align:right;">
            ${userName || 'New Member'}
          </td>
        </tr>

        <!-- Email Address -->
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #232738;color:#94a3b8;font-size:13px;">Email Address</td>
          <td style="padding:14px 20px;border-bottom:1px solid #232738;color:#38bdf8;font-size:14px;font-family:monospace;font-weight:600;text-align:right;">
            <a href="mailto:${userEmail}" style="color:#38bdf8;text-decoration:none;">${userEmail || 'N/A'}</a>
          </td>
        </tr>

        <!-- User UUID -->
        ${userId ? `
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #232738;color:#94a3b8;font-size:13px;">User ID</td>
          <td style="padding:14px 20px;border-bottom:1px solid #232738;color:#cbd5e1;font-size:11.5px;font-family:monospace;text-align:right;">
            ${userId}
          </td>
        </tr>
        ` : ''}

        <!-- Phone Number -->
        ${userPhone && userPhone !== 'Not provided' ? `
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #232738;color:#94a3b8;font-size:13px;">Phone</td>
          <td style="padding:14px 20px;border-bottom:1px solid #232738;color:#ffffff;font-size:13.5px;text-align:right;">
            ${userPhone}
          </td>
        </tr>
        ` : ''}

        <!-- Authentication Provider -->
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #232738;color:#94a3b8;font-size:13px;">Auth Method</td>
          <td style="padding:14px 20px;border-bottom:1px solid #232738;color:#ffffff;font-size:13.5px;text-align:right;">
            <span style="background:#242a3e;color:#cbd5e1;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
              ${authProvider || 'Email & Password'}
            </span>
          </td>
        </tr>

        <!-- Registration Time -->
        <tr>
          <td style="padding:14px 20px;color:#94a3b8;font-size:13px;">Registered At</td>
          <td style="padding:14px 20px;color:#e2e8f0;font-size:13px;font-weight:500;text-align:right;">
            ${formattedDate}
          </td>
        </tr>
      </table>

      <!-- Quick Platform Actions -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
        <tr>
          <td align="center">
            <a href="${userUrl}" target="_blank" style="display:inline-block;background:#008F83;color:#ffffff;padding:14px 36px;border-radius:12px;font-size:14px;font-weight:800;letter-spacing:0.5px;text-decoration:none;box-shadow:0 6px 18px rgba(0,143,131,0.35);">
              Open User Profile in Admin &rarr;
            </a>
          </td>
        </tr>
      </table>

      <!-- Micro Info Box -->
      <div style="background:#0f1118;border:1px solid #1c202e;border-radius:10px;padding:12px 16px;text-align:center;">
        <span style="font-size:11.5px;color:#64748b;line-height:1.5;">
          Direct admin link requires platform administrator authentication. Sensitive data is protected by Supabase RLS.
        </span>
      </div>
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

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#181b27;border:1px solid #232738;border-radius:12px;padding:20px;margin-bottom:24px;">
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

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#181b27;border:1px solid #232738;border-radius:12px;padding:20px;margin-bottom:24px;">
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

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#181b27;border:1px solid #232738;border-radius:12px;padding:20px;margin-bottom:24px;">
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

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#181b27;border:1px solid #232738;border-radius:12px;padding:20px;margin-bottom:24px;">
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

      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#181b27;border:1px solid #232738;border-radius:12px;padding:20px;margin-bottom:24px;">
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
