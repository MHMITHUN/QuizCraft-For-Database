const nodemailer = require('nodemailer');

let transporterPromise;

const getBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).toLowerCase().trim();
  return ['true', '1', 'yes', 'y'].includes(normalized);
};

const baseAppUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
const baseApiUrl = (process.env.API_URL || process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');

const defaultFromAddress = () => {
  const name = process.env.EMAIL_FROM_NAME || 'QuizCraft';
  const address = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USERNAME;
  return address ? `${name} <${address}>` : undefined;
};

const ensureTransporter = async () => {
  if (!transporterPromise) {
    if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
      throw new Error('Email credentials are not configured. Set EMAIL_USERNAME and EMAIL_PASSWORD.');
    }

    const port = parseInt(process.env.EMAIL_PORT || '465', 10);
    const secure = getBoolean(process.env.EMAIL_SECURE, port === 465);

    const username = /@/.test(process.env.EMAIL_USERNAME || '')
      ? process.env.EMAIL_USERNAME
      : (process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USERNAME);

    const transportConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port,
      secure,
      auth: {
        user: username,
        pass: process.env.EMAIL_PASSWORD
      }
    };

    transporterPromise = nodemailer.createTransport(transportConfig);

    if (process.env.NODE_ENV !== 'production') {
      transporterPromise
        .verify()
        .then(() => console.log('[mail] Email transporter configured successfully'))
        .catch((error) => console.warn('[warn] Email transporter verification failed:', error.message));
    }
  }

  return transporterPromise;
};

const toPlainText = (html = '') =>
  html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const build3DTemplate = ({
  heading,
  subHeading,
  previewText,
  highlight,
  ctaLabel,
  ctaUrl,
  fallbackText,
  secondaryAction
}) => {
  const safePreview = previewText || heading;
  const safeHighlight = highlight || '';
  const safeSecondary = secondaryAction || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&display=swap');
    
    @keyframes aurora {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    @keyframes floaty {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-6px); }
    }
    
    @keyframes pulseDot {
      0%, 100% { 
        transform: scale(1); 
        box-shadow: 0 0 6px rgba(56,189,248,0.7); 
      }
      50% { 
        transform: scale(1.15); 
        box-shadow: 0 0 10px rgba(56,189,248,1); 
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .cta-button {
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      animation: floaty 3s ease-in-out infinite;
    }
    .cta-button:hover {
      transform: translateY(-4px) !important;
      box-shadow: 0 22px 50px rgba(99,102,241,0.55), 0 15px 30px rgba(56,189,248,0.45) !important;
    }

    .social-icon {
      display: inline-block;
      width: 40px;
      height: 40px;
      margin: 0 8px;
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      line-height: 40px;
      text-align: center;
      text-decoration: none;
      transition: background-color 0.3s ease, transform 0.2s ease;
    }
    .social-icon img {
      width: 20px;
      height: 20px;
      vertical-align: middle;
    }
    .social-icon:hover {
      background-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }
  </style>
</head>
<body style="margin:0;background:#050716;color:#F1F5F9;font-family:'Poppins','Segoe UI',Tahoma,sans-serif;">
  <span style="display:none;opacity:0;visibility:hidden;height:0;width:0;color:transparent;">${safePreview}</span>
  
  <div style="max-width:640px;margin:0 auto;padding:48px 20px;">
    
    <div style="position:relative;
                background:radial-gradient(circle at top left,#312e81,#1e1b4b 45%,#020617 95%);
                background:linear-gradient(125deg, #1e1b4b, #312e81, #4f46e5, #38bdf8, #1e1b4b);
                background-size:400% 400%;
                animation:aurora 15s ease-in-out infinite;
                border-radius:32px;
                padding:48px 36px;
                box-shadow:0 35px 80px rgba(59,130,246,0.4);
                overflow:hidden;">

      <div style="text-align:center; margin-bottom: 30px; animation:fadeIn 0.6s ease-out forwards;">
        <img src="drive.google.com/uc?export=view&id=1HMe7ICkvXTvZqH32MoXCSZCOO_0Aci2v" alt="QuizCraft Universe" style="max-width:100%; height:auto; border-radius:18px; box-shadow:0 15px 40px rgba(0,0,0,0.35);">
      </div>
      
      <div style="position:relative;z-index:2;text-align:center;animation:fadeIn 0.6s ease-out forwards;">
        
        <div style="display:inline-flex;align-items:center;gap:12px;padding:10px 22px;background:rgba(59,130,246,0.15);border-radius:24px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:#93c5fd;box-shadow:0 12px 25px rgba(59,130,246,0.25);">
          <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#38bdf8;animation:pulseDot 2.5s ease-in-out infinite;"></span>
          QuizCraft Universe Access
        </div>
        
        <h1 style="margin:28px 0 18px;font-size:32px;line-height:1.25;font-weight:700;color:#e0f2fe;text-shadow:0 4px 20px rgba(0,0,0,0.3);">${heading}</h1>
        <p style="margin:0 auto 28px;font-size:16px;line-height:1.7;color:#cbd5f5;max-width:440px;">${subHeading}</p>
        
        <div style="margin:0 auto 24px;max-width:420px;padding:20px;border-radius:22px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);box-shadow:0 15px 30px rgba(0,0,0,0.2);backdrop-filter:blur(10px);">
          <p style="margin:0;font-size:15px;line-height:1.6;color:#e0e7ff;">${safeHighlight}</p>
        </div>
        
        <a href="${ctaUrl}" class="cta-button" style="display:inline-block;padding:16px 46px;border-radius:999px;background:linear-gradient(135deg,#38bdf8 10%,#6366f1 50%,#a855f7 90%);color:#f8fafc;font-weight:700;font-size:16px;letter-spacing:0.045em;text-decoration:none;box-shadow:0 18px 45px rgba(99,102,241,0.45),0 12px 24px rgba(56,189,248,0.35);transform:translateY(0);">
          ${ctaLabel}
        </a>
        
        <p style="margin:24px auto 0;font-size:13px;color:#94a3b8;max-width:360px;line-height:1.6;">${safeSecondary}</p>

       <div style="margin-top:40px; text-align:center;">
  <a href="https://facebook.com/" class="social-icon" style="display:inline-block; margin:0 5px; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255,255,255,0.2); padding:8px; border-radius:8px;">
    <img src="https://images.icon-icons.com/4049/PNG/512/facebook_logo_icon_257023.png" alt="Facebook" width="20" height="20">
  </a>

  <a href="https://youtube.com/" class="social-icon" style="display:inline-block; margin:0 5px; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255,255,255,0.2); padding:8px; border-radius:8px;">
    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/2560px-YouTube_full-color_icon_%282017%29.svg.png" alt="YouTube" width="20" height="20">
  </a>

  <a href="https://discord.com/" class="social-icon" style="display:inline-block; margin:0 5px; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255,255,255,0.2); padding:8px; border-radius:8px;">
    <img src="https://cdn-icons-png.flaticon.com/512/3670/3670157.png" alt="Discord" width="20" height="20">
  </a>

  <a href="https://instagram.com/" class="social-icon" style="display:inline-block; margin:0 5px; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255,255,255,0.2); padding:8px; border-radius:8px;">
    <img src="https://png.pngtree.com/template/20190718/ourmid/pngtree-instagram-logo-with-name-png-image_238618.jpg" alt="Instagram" width="20" height="20">
  </a>
</div>


      </div>
    </div>
    
    <div style="margin:28px auto 0;padding:0 10px;text-align:center;color:#64748b;font-size:13px;line-height:1.7;">
      <p style="margin:0 0 12px;">${fallbackText}</p>
      <p style="margin:0;">Sent with sparks by <strong style="color:#94a3b8;">QuizCraft</strong></p>
    </div>
  </div>
</body>
</html>`;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = await ensureTransporter();
  const mailOptions = {
    from: defaultFromAddress(),
    to,
    subject,
    html,
    text: text || toPlainText(html)
  };

  return transporter.sendMail(mailOptions);
};

const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${baseAppUrl}/auth/verify-email?token=${token}`;
  const apiVerifyUrl = `${baseApiUrl}/api/auth/verify-email/${token}`;
  const subject = 'Verify your QuizCraft galaxy access';

  const html = build3DTemplate({
    heading: `Ready to launch, ${user.name || 'Explorer'}?`,
    subHeading: 'Confirm your email to unlock AI-crafted quizzes, holographic learning paths, and your personalized education co-pilot.',
    previewText: 'Verify your QuizCraft account to begin the adventure.',
    highlight: `Tap the button below within 24 hours to activate <strong>${user.email}</strong>.`,
    ctaLabel: 'Verify Email & Enter',
    ctaUrl: apiVerifyUrl,
    fallbackText: `If the neon button is shy, copy this launch code into your browser: ${verifyUrl} (API fallback: ${apiVerifyUrl}).`,
    secondaryAction: 'This link self-destructs in 24 hours. Need a fresh portal? Request a new one from the app login screen.'
  });

  const text = `Hi ${user.name || 'there'},

Thanks for boarding QuizCraft! Please verify your email within 24 hours to activate ${user.email}.

Primary link: ${verifyUrl}
API fallback: ${apiVerifyUrl}

If you did not create this account, ignore this email.

Team QuizCraft`;

  await sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${baseAppUrl}/auth/reset-password?token=${token}`;
  const apiResetUrl = `${baseApiUrl}/api/auth/reset-password`;
  const subject = 'Reset your QuizCraft access key';

  const html = build3DTemplate({
    heading: 'Need a new access code?',
    subHeading: 'We received a request to reset your QuizCraft password. Secure your cockpit with a fresh key.',
    previewText: 'Reset your QuizCraft password securely.',
    highlight: `Use the portal below within <strong>5 minutes</strong> to reset the password for <strong>${user.email}</strong>.`,
    ctaLabel: 'Reset Password',
    ctaUrl: resetUrl,
    fallbackText: `Can't click? Open ${resetUrl}. Prefer the direct API? POST your new password and token to ${apiResetUrl}.`,
    secondaryAction: "Didn't request this reset? Simply ignore this message and your current password remains active."
  });

  const text = `Hi ${user.name || 'there'},

Reset your QuizCraft password using the link below within 5 minutes:
${resetUrl}

If you didn't request this, ignore the email.

QuizCraft Security Team`;

  await sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
};

const sendVerificationCodeEmail = async (user, code) => {
  const subject = 'Your QuizCraft verification code';
  const html = build3DTemplate({
    heading: 'Verify your email',
    subHeading: `Enter this 6-digit code in the app to verify ${user.email}.`,
    previewText: 'Email verification code',
    highlight: `Your code is <strong style="font-size:22px;letter-spacing:6px;">${code}</strong>. It expires in 15 minutes.`,
    ctaLabel: 'Open App',
    ctaUrl: process.env.APP_URL || 'http://localhost:3000',
    fallbackText: `Code: ${code}. Expires in 15 minutes. If you didn't request this, you can ignore this email.`,
    secondaryAction: "Didn't request this? Ignore this message."
  });
  const text = `Your QuizCraft verification code is ${code}. It expires in 15 minutes.`;
  await sendEmail({ to: user.email, subject, html, text });
};

const sendPasswordResetCodeEmail = async (user, code) => {
  const subject = 'Your QuizCraft password reset code';
  const html = build3DTemplate({
    heading: 'Reset your password',
    subHeading: `Use this 6-digit code to reset the password for ${user.email}.`,
    previewText: 'Password reset code',
    highlight: `Your code is <strong style="font-size:22px;letter-spacing:6px;">${code}</strong>. It expires in 15 minutes.`,
    ctaLabel: 'Open App',
    ctaUrl: process.env.APP_URL || 'http://localhost:3000',
    fallbackText: `Code: ${code}. Expires in 15 minutes. If you didn't request this, ignore this email.`,
    secondaryAction: "Didn't request this reset? Ignore this message."
  });
  const text = `Your QuizCraft password reset code is ${code}. It expires in 15 minutes.`;
  await sendEmail({ to: user.email, subject, html, text });
};

const sendAdminLoginCodeEmail = async (user, code) => {
  const subject = '🔐 QuizCraft Admin Login Verification';
  const html = build3DTemplate({
    heading: 'Admin Login Verification',
    subHeading: `A login attempt was made to your admin account. Enter this code to complete authentication.`,
    previewText: 'Admin 2FA verification code',
    highlight: `Your verification code is <strong style="font-size:24px;letter-spacing:8px;color:#38bdf8;text-shadow:0 0 10px rgba(56,189,248,0.5);">${code}</strong><br/><br/>This code expires in <strong>10 minutes</strong>.`,
    ctaLabel: 'Open Admin Panel',
    ctaUrl: process.env.APP_URL || 'http://localhost:3000',
    fallbackText: `Admin Login Code: ${code}. Valid for 10 minutes. If you didn't attempt to login, secure your account immediately.`,
    secondaryAction: "🔒 Didn't try to login? Change your admin password immediately and contact support."
  });
  const text = `Admin Login Verification\n\nYour QuizCraft admin login code is ${code}.\nThis code expires in 10 minutes.\n\nIf you didn't attempt to login, secure your account immediately.\n\nQuizCraft Security Team`;
  await sendEmail({ to: user.email, subject, html, text });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendVerificationCodeEmail,
  sendPasswordResetCodeEmail,
  sendAdminLoginCodeEmail
};
