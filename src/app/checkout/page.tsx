import { CheckoutForm } from "@/components/checkout-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { lookupPostalCode } from "@/lib/postal-code";
import { fetchShippingSettings } from "@/lib/settings";

export default async function CheckoutPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: client } = user
    ? await supabase
        .from("clients")
        .select(
          "id, name, email, phone, street, exterior_number, interior_number, neighborhood, postal_code, municipality, city, state"
        )
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const postalCodeInfo = client?.postal_code
    ? await lookupPostalCode(supabase, client.postal_code)
    : null;

  const { freeShippingThreshold, shippingCost } = await fetchShippingSettings();

  return (
    <div className="mx-auto max-w-[640px] px-5 py-6 md:px-16">
      <h1 className="mb-6 font-headline text-3xl text-aura-on-surface">
        Pagar
      </h1>
      <CheckoutForm
        client={client}
        isLoggedIn={Boolean(user)}
        initialColonias={postalCodeInfo?.colonias ?? []}
        freeShippingThreshold={freeShippingThreshold}
        shippingRate={shippingCost}
      />
    </div>
  );
}
