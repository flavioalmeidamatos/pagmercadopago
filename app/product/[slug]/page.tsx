import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ReviewsList } from "@/components/store/reviews-list";
import { getProductBySlug } from "@/lib/data/store";
import { formatCurrency } from "@/lib/utils";
import { ProductActionPanel } from "@/components/store/product-action-panel";

export default async function ProductPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="container py-12">
      <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr]">
        <div className="relative min-h-[520px] overflow-hidden rounded-[36px] border border-border bg-white">
          <Image
            src={product.images[0]?.image_url ?? ""}
            alt={product.images[0]?.alt_text ?? product.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge>{product.brand}</Badge>
            {product.is_featured && <Badge>Destaque</Badge>}
            {product.is_kit && <Badge className="bg-accent text-accent-foreground">Kit</Badge>}
          </div>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              {product.name}
            </h1>
            <p className="mt-4 text-lg text-muted">{product.subtitle}</p>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-semibold">{formatCurrency(product.price)}</span>
            {product.compare_at_price && (
              <span className="pb-1 text-muted line-through">
                {formatCurrency(product.compare_at_price)}
              </span>
            )}
          </div>
          <p className="text-sm leading-7 text-muted">{product.description}</p>
          <ProductActionPanel product={product} />
          <div className="rounded-[28px] border border-border bg-white/80 p-6 text-sm leading-7 text-muted">
            <p>Estoque disponível: {product.inventory_count} unidades</p>
            <p>Avaliação média: {product.rating.toFixed(1)} / 5</p>
            <p>Categoria: {product.category?.name ?? "Premium beauty"}</p>
          </div>
        </div>
      </div>

      {!!product.reviews?.length && (
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">Avaliações</h2>
          <div className="mt-6">
            <ReviewsList reviews={product.reviews} />
          </div>
        </section>
      )}
    </div>
  );
}

