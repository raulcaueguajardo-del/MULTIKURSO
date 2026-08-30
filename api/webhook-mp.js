import { MercadoPagoConfig, Payment } from "mercadopago";
import { Resend } from "resend";

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { type, data } = req.body;

  if (type !== "payment") {
    return res.status(200).json({ ok: true });
  }

  const paymentId = data?.id;
  if (!paymentId) {
    return res.status(400).json({ error: "ID de pago no encontrado" });
  }

  try {
    const payment = new Payment(mp);
    const pago = await payment.get({ id: paymentId });

    if (pago.status !== "approved") {
      return res.status(200).json({ ok: true, estado: pago.status });
    }

    const { metadata } = pago;
    const { cliente_email, cliente_nombre, curso_link, curso_titulo } = metadata || {};

    if (!cliente_email || !curso_link) {
      return res.status(400).json({ error: "Metadatos incompletos" });
    }

    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Multikurso <onboarding@resend.dev>",
      to: cliente_email,
      subject: `Tu acceso a "${curso_titulo}" ya está listo`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#F7F6F2;">
          <h2 style="font-size:20px;font-weight:900;color:#0F1B2D;">
            Multi<span style="color:#F5C518;">kurso</span>
          </h2>
          <div style="background:#fff;border-radius:12px;padding:28px;margin-top:16px;">
            <h3 style="font-size:18px;color:#0F1B2D;margin:0 0 8px;">¡Tu curso está listo!</h3>
            <p style="color:#5F5E5A;font-size:14px;margin:0 0 20px;">
              Hola ${cliente_nombre?.split(" ")[0] || "ahí"}, tu pago fue confirmado.
            </p>
            <div style="background:#F7F6F2;border-radius:8px;padding:14px;margin-bottom:20px;">
              <div style="font-size:12px;color:#888;margin-bottom:4px;">Tu curso</div>
              <div style="font-size:15px;font-weight:700;color:#0F1B2D;">${curso_titulo}</div>
            </div>
            <a href="${curso_link}"
               style="display:block;background:#F5C518;color:#0F1B2D;font-weight:700;
                      font-size:15px;padding:14px;border-radius:8px;text-align:center;
                      text-decoration:none;">
              Acceder al curso →
            </a>
            <p style="font-size:12px;color:#aaa;text-align:center;margin-top:16px;">
              Acceso de por vida · Ref: ${paymentId}
            </p>
          </div>
          <p style="font-size:12px;color:#aaa;text-align:center;margin-top:16px;">
            🛡️ 7 días de garantía — respondemos a este email
          </p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true, email_enviado: true });
  } catch (error) {
    console.error("Error webhook:", error);
    return res.status(200).json({ ok: false, error: error.message });
  }
}
