"use client";

import Link from "next/link";
import { Heart, Menu, Search, ShoppingBag, Sparkles } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/components/cart/cart-sheet";
import { LogOut, User } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const nav = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catálogo" },
  { href: "/favorites", label: "Favoritos" },
  { href: "/account", label: "Minha conta" }
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { itemsCount } = useCart();
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/80 backdrop-blur-xl">
        <div className="container flex h-20 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-foreground">
                Lumina Beautiful
              </p>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">
                Premium Beauty Store
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-foreground/80 transition hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/catalog?featured=true">
                <Search className="mr-2 h-4 w-4" />
                Descobrir
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/favorites">
                <Heart className="mr-2 h-4 w-4" />
                Favoritos
              </Link>
            </Button>
            
            {user ? (
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden sm:inline-flex text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            ) : (
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/account">
                  <User className="mr-2 h-4 w-4" />
                  Entrar
                </Link>
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => setCartOpen(true)}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              Carrinho
              {itemsCount > 0 && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                  {itemsCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-border bg-white md:hidden">
            <div className="container flex flex-col gap-4 py-4">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>
      <CartSheet isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
