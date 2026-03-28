import { HeroSection } from "@/components/store/hero-section";
import { CheckoutSuccessBanner } from "@/components/store/checkout-success-banner";
import { ProductGrid } from "@/components/store/product-grid";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getFeaturedProducts, getKitProducts, getSiteSettings } from "@/lib/data/store";

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const [featuredProducts, kitProducts, settings] = await Promise.all([
    getFeaturedProducts(),
    getKitProducts(),
    getSiteSettings()
  ]);

  return (
    <div className="pb-16">
      {params?.checkout === "success" && <CheckoutSuccessBanner />}
      <HeroSection heroTag={settings.heroTag} />

      <section className="container py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <Badge>Destaques</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              Produtos em destaque para alta conversão
            </h2>
          </div>
        </div>
        <ProductGrid products={featuredProducts} />
      </section>

      <section className="container py-10">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-white/80">
            <CardContent className="space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-muted">Entrega</p>
              <h3 className="text-2xl font-semibold">Frete fixo configurável</h3>
              <p className="text-sm leading-7 text-muted">
                Controle total do valor de envio pela tabela de configurações do projeto.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-muted">Checkout</p>
              <h3 className="text-2xl font-semibold">Pagamentos Seguros</h3>
              <p className="text-sm leading-7 text-muted">
                Usando criptofogia mais segura nas suas transações
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/80">
            <CardContent className="space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-muted">Conta</p>
              <h3 className="text-2xl font-semibold">Pedidos e favoritos</h3>
              <p className="text-sm leading-7 text-muted">
                Área autenticada com Supabase para acompanhar pedidos e cobranças.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-14">
        <div className="mb-8">
          <Badge className="bg-accent text-accent-foreground">Kits promocionais</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            Rituals completos com percepção de valor mais alta
          </h2>
        </div>
        <ProductGrid products={kitProducts} />
      </section>
    </div>
  );
}
