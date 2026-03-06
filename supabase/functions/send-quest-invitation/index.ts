const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { challengedName, challengedEmail, challengerUsername, habitName, targetDays, bounty } = await req.json();

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin:0;padding:0;background:#050505;font-family:'Inter',Arial,sans-serif;color:#e2e8f0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" style="max-width:480px;background:#0f0f12;border:1px solid rgba(255,255,255,0.1);border-radius:24px;overflow:hidden;">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:32px;text-align:center;">
                  <p style="margin:0 0 8px 0;font-size:12px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.7);">DETERMINED</p>
                  <h1 style="margin:0;font-size:28px;font-weight:900;font-style:italic;text-transform:uppercase;color:#ffffff;letter-spacing:-0.02em;">You've Been Challenged</h1>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 16px 0;font-size:15px;color:#94a3b8;line-height:1.6;">
                    Hey <strong style="color:#ffffff;">${challengedName}</strong>,
                  </p>
                  <p style="margin:0 0 24px 0;font-size:15px;color:#94a3b8;line-height:1.6;">
                    <strong style="color:#ffffff;">@${challengerUsername}</strong> believes you can do
                    <strong style="color:#ffffff;"> ${habitName}</strong> for
                    <strong style="color:#ffffff;"> ${targetDays} days</strong> straight — and they've staked money on it.
                  </p>

                  <!-- Quest Details -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);border-radius:16px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:24px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-bottom:12px;">
                              <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:rgba(167,139,250,0.6);">The Challenge</p>
                              <p style="margin:4px 0 0;font-size:22px;font-weight:900;color:#ffffff;">${habitName}</p>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="width:50%;">
                                    <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:rgba(167,139,250,0.6);">Duration</p>
                                    <p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#ffffff;">${targetDays} days</p>
                                  </td>
                                  <td style="width:50%;">
                                    <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:rgba(167,139,250,0.6);">Bounty</p>
                                    <p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#ffffff;">$${bounty}</p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;text-align:center;">
                    Are you DETERMINED enough to prove them right?
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:16px 32px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
                  <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#334155;">DETERMINED APP</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'DETERMINED <noreply@determined-app.com>',
      to: [challengedEmail],
      subject: `@${challengerUsername} has challenged you — DETERMINED`,
      html: emailHtml,
    }),
  });

  const data = await res.json();
  console.log('Resend response:', JSON.stringify(data));

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: res.ok ? 200 : 400,
  });
});
