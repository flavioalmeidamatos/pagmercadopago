import { env, hasFormSubmitEnv } from "@/lib/env";

const VALIDATED_FORMSUBMIT_ENDPOINT = "https://formsubmit.co/el/tumohu";

type PaidOrderEmailItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
};

type PaidOrderEmailPayload = {
  buyerEmail: string;
  orderId: string;
  totalAmount: number;
  shippingAmount: number;
  discountAmount: number;
  items: PaidOrderEmailItem[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function buildOrderMessage(payload: PaidOrderEmailPayload) {
  const items = payload.items
    .map(
      (item) =>
        `- ${item.product_name} x${item.quantity} (${formatCurrency(item.unit_price)})`
    )
    .join("\n");

  return [
    "Seu pedido foi fechado e pago com sucesso.",
    "",
    `Pedido: ${payload.orderId}`,
    `Total: ${formatCurrency(payload.totalAmount)}`,
    `Frete: ${formatCurrency(payload.shippingAmount)}`,
    `Desconto: ${formatCurrency(payload.discountAmount)}`,
    "",
    "Itens:",
    items || "- Nenhum item informado"
  ].join("\n");
}

function buildHtmlOrderMessage(payload: PaidOrderEmailPayload) {
  const itemsHtml = payload.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product_name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unit_price)}</td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #c9a050;">Lumina Beautiful - Pedido Confirmado!</h2>
      <p>Olá, o seu pedido foi recebido e o pagamento foi confirmado com sucesso.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f9f9f9;">
          <th style="padding: 10px; text-align: left;">Produto</th>
          <th style="padding: 10px; text-align: center;">Qtd</th>
          <th style="padding: 10px; text-align: right;">Preço</th>
        </tr>
        ${itemsHtml}
      </table>
      
      <div style="text-align: right; font-size: 14px; line-height: 1.6;">
        <p><strong>Subtotal:</strong> ${formatCurrency(payload.totalAmount - payload.shippingAmount + payload.discountAmount)}</p>
        <p><strong>Frete:</strong> ${formatCurrency(payload.shippingAmount)}</p>
        <p><strong>Desconto:</strong> -${formatCurrency(payload.discountAmount)}</p>
        <p style="font-size: 18px; color: #c9a050;"><strong>Total Pago: ${formatCurrency(payload.totalAmount)}</strong></p>
      </div>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666; text-align: center;">
        Lumina Beautiful | Premium Beauty Store<br/>
        ID do Pedido: ${payload.orderId}
      </p>
    </div>
  `;
}

async function submitFormSubmit(
  endpoint: string,
  payload: PaidOrderEmailPayload
) {
  if (env.resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.resendApiKey}`
        },
        body: JSON.stringify({
          from: "Lumina Beautiful <vendas@send.resolveplanilhas.com.br>", // Verified subdomain
          to: [payload.buyerEmail],
          subject: `Pedido pago #${payload.orderId} - Lumina Beautiful`,
          html: buildHtmlOrderMessage(payload)
        })
      });
      if (res.ok) return;
      console.warn("Resend failed, falling back to FormSubmit", await res.text());
    } catch (e) {
      console.error("Resend error:", e);
    }
  }

  const message = buildOrderMessage(payload);
  const formData = new URLSearchParams();
  formData.set("name", "Lumina Beautiful");
  formData.set("email", payload.buyerEmail);
  formData.set("_autoresponse", "Obrigado por comprar conosco! O seu pedido foi confirmado.\n\n" + message);
  formData.set("_replyto", payload.buyerEmail);
  formData.set("_subject", `Pedido pago #${payload.orderId} - Lumina Beautiful`);
  formData.set("_url", env.siteUrl);
  formData.set("message", message);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: env.siteUrl,
      Referer: `${env.siteUrl}/`
    },
    body: formData,
    redirect: "manual"
  });

  const contentType = response.headers.get("content-type") ?? "";
  const bodyText = await response.text();

  if (![200, 302].includes(response.status)) {
    throw new Error(`FormSubmit retornou status ${response.status}.`);
  }

  if (contentType.includes("application/json")) {
    try {
      const result = JSON.parse(bodyText) as { success?: string | boolean; message?: string };
      if (result.success === false || result.success === "false") {
        throw new Error(result.message || "FormSubmit rejeitou o envio.");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
    }
  }

  if (bodyText.includes("\"success\":\"false\"")) {
    throw new Error("FormSubmit respondeu sucesso=false.");
  }

  return {
    status: response.status,
    location: response.headers.get("location")
  };
}

export async function sendPaidOrderEmail(payload: PaidOrderEmailPayload) {
  // If we have Resend, try it first as primary
  if (env.resendApiKey) {
    try {
      const result = await submitFormSubmit(env.formSubmitEndpoint, payload);
      return result;
    } catch (e) {
      console.warn("Emails via Resend/Primary failed, already tried in submitFormSubmit. Error logged.", e);
    }
  }

  // Fallback to FormSubmit if env allows it
  if (!hasFormSubmitEnv()) {
    console.warn("Nenhum serviço de e-mail (Resend ou FormSubmit) configurado.");
    return;
  }

  try {
    return await submitFormSubmit(env.formSubmitEndpoint, payload);
  } catch (primaryError) {
    if (env.formSubmitEndpoint === VALIDATED_FORMSUBMIT_ENDPOINT) {
      throw primaryError;
    }

    console.warn("Falha no endpoint principal do FormSubmit, tentando fallback validado.");
    return submitFormSubmit(VALIDATED_FORMSUBMIT_ENDPOINT, payload);
  }
}
