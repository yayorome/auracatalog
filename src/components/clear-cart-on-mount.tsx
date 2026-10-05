"use client";

import { useEffect } from "react";

import { useCart } from "@/lib/cart-context";

export function ClearCartOnMount() {
  const { clear } = useCart();
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("aura-cart");
      } catch {
        // ignore
      }
    }
    clear();
  }, [clear]);
  return null;
}
