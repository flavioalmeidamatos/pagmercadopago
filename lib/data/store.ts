import type { OrderSummary, Product, ProductCategory } from "@/types/domain";
import type { Database } from "@/types/supabase";
import { fallbackProducts, defaultCoupons } from "@/lib/mock-data";
import { defaultSiteSettings, categoriesSeed } from "@/lib/site";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

type CatalogFilters = {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  featuredOnly?: boolean;
  kitsOnly?: boolean;
  search?: string;
};

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];
type FavoriteRow = Database["public"]["Tables"]["favorites"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type SiteSettingRow = Database["public"]["Tables"]["site_settings"]["Row"];

type ProductWithRelations = ProductRow & {
  category?: CategoryRow | null;
  product_images?: ProductImageRow[] | null;
  images?: ProductImageRow[] | null;
  reviews?: ReviewRow[] | null;
};

type OrderWithItems = OrderRow & {
  items?: OrderItemRow[] | null;
};

function normalizeProduct(product: ProductWithRelations): Product {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    brand: product.brand,
    price: Number(product.price),
    compare_at_price: product.compare_at_price ? Number(product.compare_at_price) : null,
    rating: Number(product.rating ?? 0),
    reviews_count: Number(product.reviews_count ?? 0),
    inventory_count: Number(product.inventory_count ?? 0),
    is_featured: Boolean(product.is_featured),
    is_kit: Boolean(product.is_kit),
    category_id: product.category_id,
    category: product.category ?? null,
    images: (product.product_images ?? product.images ?? []).map((image: ProductImageRow, index: number) => ({
      id: image.id ?? `${product.id}-${index}`,
      image_url: image.image_url,
      alt_text: image.alt_text ?? null,
      sort_order: image.sort_order ?? index
    })),
    reviews: (product.reviews ?? []).map((review: ReviewRow) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      content: review.content,
      author_name: review.author_name,
      created_at: review.created_at
    }))
  };
}

function applyFilters(products: Product[], filters: CatalogFilters = {}) {
  return products.filter((product) => {
    if (filters.category && product.category?.slug !== filters.category) {
      return false;
    }

    if (
      filters.brand &&
      product.brand.toLowerCase() !== filters.brand.toLowerCase()
    ) {
      return false;
    }

    if (typeof filters.minPrice === "number" && product.price < filters.minPrice) {
      return false;
    }

    if (typeof filters.maxPrice === "number" && product.price > filters.maxPrice) {
      return false;
    }

    if (typeof filters.minRating === "number" && product.rating < filters.minRating) {
      return false;
    }

    if (filters.featuredOnly && !product.is_featured) {
      return false;
    }

    if (filters.kitsOnly && !product.is_kit) {
      return false;
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      const haystack = `${product.name} ${product.subtitle} ${product.brand}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }

    return true;
  });
}

export async function getCategories(): Promise<ProductCategory[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return categoriesSeed;
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error || !data?.length) {
    return categoriesSeed;
  }

  return data as ProductCategory[];
}

export async function getProducts(filters: CatalogFilters = {}) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return applyFilters(fallbackProducts, filters);
  }

  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), product_images(*), reviews(*)")
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return applyFilters(fallbackProducts, filters);
  }

  return applyFilters((data as ProductWithRelations[]).map(normalizeProduct), filters);
}

export async function getFeaturedProducts() {
  const products = await getProducts({ featuredOnly: true });
  return products.slice(0, 6);
}

export async function getKitProducts() {
  const products = await getProducts({ kitsOnly: true });
  return products.slice(0, 3);
}

export async function getProductBySlug(slug: string) {
  const products = await getProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getSiteSettings() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return defaultSiteSettings;
  }

  const { data } = await supabase.from("site_settings").select("*");

  if (!data?.length) {
    return defaultSiteSettings;
  }

  const settings = { ...defaultSiteSettings };
  for (const entry of data as SiteSettingRow[]) {
    if (entry.key === "shipping_flat_rate") {
      settings.shippingFlatRate = Number(entry.value ?? settings.shippingFlatRate);
    }
    if (entry.key === "promo_banner") {
      settings.promoBanner = String(entry.value ?? settings.promoBanner);
    }
    if (entry.key === "hero_tag") {
      settings.heroTag = String(entry.value ?? settings.heroTag);
    }
    if (entry.key === "whatsapp_number") {
      settings.whatsappNumber = String(entry.value ?? settings.whatsappNumber);
    }
  }

  return settings;
}

export async function validateCoupon(code: string) {
  const normalized = code.trim().toUpperCase();
  const supabase = createSupabaseAdminClient();

  if (supabase) {
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", normalized)
      .eq("is_active", true)
    .maybeSingle();

    if (data) {
      return data as CouponRow;
    }
  }

  return (
    defaultCoupons.find((coupon) => coupon.code === normalized) ?? null
  );
}

export async function getOrdersByUser(userId: string): Promise<OrderSummary[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (
    (data as OrderWithItems[] | null)?.map((order) => ({
      id: order.id,
      status: order.status,
      total_amount: Number(order.total_amount),
      subtotal_amount: Number(order.subtotal_amount),
      shipping_amount: Number(order.shipping_amount),
      discount_amount: Number(order.discount_amount),
      created_at: order.created_at,
      stripe_session_id: order.stripe_session_id,
      payment_intent_id: order.payment_intent_id,
      items: (order.items ?? []).map((item) => ({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        image_url: item.image_url
      }))
    })) ?? []
  );
}

export async function getRecentOrders(limit = 8): Promise<OrderSummary[]> {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (
    (data as OrderWithItems[] | null)?.map((order) => ({
      id: order.id,
      status: order.status,
      total_amount: Number(order.total_amount),
      subtotal_amount: Number(order.subtotal_amount),
      shipping_amount: Number(order.shipping_amount),
      discount_amount: Number(order.discount_amount),
      created_at: order.created_at,
      stripe_session_id: order.stripe_session_id,
      payment_intent_id: order.payment_intent_id,
      items: (order.items ?? []).map((item) => ({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        image_url: item.image_url
      }))
    })) ?? []
  );
}

export async function getFavoritesByUser(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", userId);

  return (data as FavoriteRow[] | null)?.map((entry) => entry.product_id) ?? [];
}
