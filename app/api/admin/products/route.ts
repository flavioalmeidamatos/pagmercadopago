import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  brand: z.string().min(2),
  categorySlug: z.string().min(2),
  price: z.coerce.number().positive(),
  compareAtPrice: z.coerce.number().optional().nullable(),
  inventoryCount: z.coerce.number().int().nonnegative(),
  subtitle: z.string().min(3),
  description: z.string().min(10),
  imageUrl: z.string().url(),
  isFeatured: z.string().optional(),
  isKit: z.string().optional()
});

export async function POST(request: Request) {
  await requireAdmin();
  // The generated Database type is not complete enough for typed inserts yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseAdminClient() as any;

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service role não configurado." },
      { status: 500 }
    );
  }

  const payload = productSchema.parse(await request.json());
  const categorySlug = slugify(payload.categorySlug);

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (!category) {
    return NextResponse.json({ error: "Categoria não encontrada." }, { status: 400 });
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name: payload.name,
      slug: slugify(payload.slug),
      brand: payload.brand,
      category_id: category.id,
      price: payload.price,
      compare_at_price: payload.compareAtPrice || null,
      inventory_count: payload.inventoryCount,
      subtitle: payload.subtitle,
      description: payload.description,
      is_featured: payload.isFeatured === "true",
      is_kit: payload.isKit === "true"
    })
    .select()
    .single();

  if (error || !product) {
    return NextResponse.json({ error: "Falha ao salvar produto." }, { status: 500 });
  }

  await supabase.from("product_images").insert({
    product_id: product.id,
    image_url: payload.imageUrl,
    alt_text: payload.name,
    sort_order: 0
  });

  return NextResponse.json({ id: product.id });
}
