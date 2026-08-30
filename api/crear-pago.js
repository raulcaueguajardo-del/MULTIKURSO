import { MercadoPagoConfig, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const CURSOS = {
  "chatgpt-productividad": {
    title: "ChatGPT para trabajar 2x más rápido",
    unit_price: 37,
    description: "IA & Productividad · Acceso de por vida",
    link: "https://drive.google.com/drive/folders/TU_CARPETA_ID",
  },
  "finanzas-desde-cero": {
    title: "Finanzas personales desde cero",
    unit_price: 29,
    description: "Finanzas · Acceso de por vida",
    link: "https://drive.google.com/drive/folders/TU_CARPETA_ID_2",
  },
  "notion-organiza-tu-vida": {
    title: "Notion para organizar tu vida y trabajo",
    unit_price: 19,
    description: "Habilidades · Acceso de por vida",
    link: "https://drive.google.com/drive/folders/TU_CARPETA_ID_3",
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { cursoId, nombre, apellido, email } = req.body;

  if (!cursoId || !nombre || !apellido || !email) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  const curso = CURSOS[cursoId];
  if (!curso) {
    return res.status(404).json({ error: "Curso no encontrado" });
  }

  const siteUrl = process.env.SITE_URL || "https://multikurso.vercel.app";

  try {
    const preference = new Preference(client);
    const response = await preference.create({
      body: {
        items: [{ id: cursoId, title: curso.title, description: curso.description, quantity: 1, unit_price: curso.unit_price, currency_id: "Ars" }],
        payer: { name: nombre, surname: apellido, email: email },
        back_urls: { success: `${siteUrl}/gracias`, failure: `${siteUrl}/error`, pending: `${siteUrl}/pendiente` },
        auto_return: "approved",
        notification_url: `${siteUrl}/api/webhook-mp`,
        metadata: { curso_id: cursoId, cliente_email: email, cliente_nombre: `${nombre} ${apellido}`, curso_link: curso.link, curso_titulo: curso.title },
      },
    });

    return res.status(200).json({ init_point: response.init_point, sandbox_init_point: response.sandbox_init_point });
  } catch (error) {
    return res.status(500).json({ error: "Error al generar el pago" });
  }
}
