import { env, hasFormSubmitEnv } from "@/lib/env";

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

export async function sendPaidOrderEmail(payload: PaidOrderEmailPayload) {
  if (!hasFormSubmitEnv()) {
    return;
  }

  const formData = new URLSearchParams();
  formData.set("name", "Lumina Beautiful");
  formData.set("email", env.formSubmitSenderEmail);
  formData.set("_replyto", payload.buyerEmail);
  formData.set("_cc", payload.buyerEmail);
  formData.set("_subject", `Pedido pago #${payload.orderId}`);
  formData.set("_url", env.siteUrl);
  formData.set("message", buildOrderMessage(payload));

  const response = await fetch(env.formSubmitEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: env.siteUrl,
      Referer: `${env.siteUrl}/`
    },
    body: formData,
    redirect: "manual"
  });

  if (![200, 302].includes(response.status)) {
    throw new Error("Falha ao enviar o e-mail de confirmação do pedido.");
  }
}
