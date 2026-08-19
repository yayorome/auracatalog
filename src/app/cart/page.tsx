import { CartView } from "@/components/cart-view";

export default function CartPage() {
  return (
    <div className="mx-auto max-w-[720px] px-5 py-6 md:px-16">
      <h1 className="mb-6 font-headline text-3xl text-aura-on-surface">
        Tu carrito
      </h1>
      <CartView />
    </div>
  );
}
