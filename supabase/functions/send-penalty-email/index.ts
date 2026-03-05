const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { tempterName, tempterEmail, habitName, amount } = await req.json();

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
                  <h1 style="margin:0;font-size:28px;font-weight:900;font-style:italic;text-transform:uppercase;color:#ffffff;letter-spacing:-0.02em;">Penalty Notice</h1>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 16px 0;font-size:15px;color:#94a3b8;line-height:1.6;">
                    Hi <strong style="color:#ffffff;">${tempterName}</strong>,
                  </p>
                  <p style="margin:0 0 24px 0;font-size:15px;color:#94a3b8;line-height:1.6;">
                    You've been reported for attempting to break someone's
                    <strong style="color:#ffffff;"> ${habitName}</strong> streak.
                    As a result, you have been charged a penalty.
                  </p>

                  <!-- Penalty Amount -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:16px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:24px;text-align:center;">
                        <p style="margin:0 0 4px 0;font-size:11px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:rgba(239,68,68,0.6);">Penalty Amount</p>
                        <p style="margin:0;font-size:48px;font-weight:900;color:#f87171;letter-spacing:-0.02em;">$${amount}.00</p>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;text-align:center;">
                    Think twice before tempting someone who is DETERMINED.
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
      from: 'DETERMINED <onboarding@resend.dev>',
      to: [tempterEmail],
      subject: `You've been charged a $${amount} penalty — DETERMINED`,
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
