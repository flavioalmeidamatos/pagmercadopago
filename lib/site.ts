import type { SiteSettings } from "@/types/domain";

export const defaultSiteSettings: SiteSettings = {
  shippingFlatRate: 24.9,
  promoBanner: "Frete fixo nacional e 10% off no cupom LUXE10 nas compras acima de R$ 299.",
  heroTag: "Ritual premium para pele e perfume",
  whatsappNumber: "5521988681799"
};

export const categoriesSeed = [
  {
    id: "cat-skincare",
    name: "Skincare",
    slug: "skincare",
    description: "Rotinas completas para glow, firmeza e hidratação."
  },
  {
    id: "cat-maquiagem",
    name: "Maquiagem",
    slug: "maquiagem",
    description: "Make sofisticada com acabamento luminoso."
  },
  {
    id: "cat-kits",
    name: "Kits",
    slug: "kits",
    description: "Seleções inteligentes para presentear ou economizar."
  },
  {
    id: "cat-perfumes",
    name: "Perfumes",
    slug: "perfumes",
    description: "Fragrâncias elegantes e memoráveis."
  }
];
