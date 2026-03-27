export const resetPasswordTemplate = ({ email, resetLink }) => {
  return `<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700" rel="stylesheet" type="text/css">
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #e7e7e7; font-family: 'Open Sans', Arial, sans-serif; }
    .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: #f2f2f2; padding: 20px; text-align: center; }
    .header img { width: 140px; height: auto; }
    .body { padding: 30px 25px; }
    .body h1 { font-size: 22px; color: #213b7e; margin: 0 0 15px 0; }
    .body p { font-size: 15px; color: #333; line-height: 1.6; margin: 0 0 15px 0; }
    .btn-wrap { text-align: center; margin: 25px 0; }
    .btn { display: inline-block; padding: 12px 30px; background-color: #213b7e; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-size: 15px; font-weight: 600; }
    .footer { background: #833589; padding: 15px; text-align: center; }
    .footer p { color: #ffffff; font-size: 12px; margin: 0; }
    .note { font-size: 13px; color: #888; margin-top: 20px; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#e7e7e7; padding: 20px 0;">
    <tr>
      <td align="center">
        <div class="container">
          <div class="header">
            <img src="https://www.ipmcareer.com/wp-content/uploads/2022/02/logo-final-1-2048x488.png" alt="IPM Careers" />
          </div>
          <div class="body">
            <h1>Reset Your Password</h1>
            <p>Hi there,</p>
            <p>We received a request to reset the password for your IPM Careers account (<strong>${email}</strong>). Click the button below to set a new password:</p>
            <div class="btn-wrap">
              <a href="${resetLink}" class="btn" target="_blank">Reset Password</a>
            </div>
            <p class="note">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't be changed.</p>
          </div>
          <div class="footer">
            <p>IPM Careers &bull; ipmcareer.com</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
