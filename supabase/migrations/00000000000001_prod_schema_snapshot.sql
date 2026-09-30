


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."quote_status" AS ENUM (
    'draft',
    'sent',
    'converted',
    'expired'
);


ALTER TYPE "public"."quote_status" OWNER TO "postgres";


CREATE TYPE "public"."sale_status" AS ENUM (
    'draft',
    'pending_payment',
    'paid',
    'cancelled',
    'refunded'
);


ALTER TYPE "public"."sale_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'owner',
    'seller'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_quote_to_sale"("p_quote_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_quote record;
  v_sale_id uuid;
begin
  select * into v_quote from public.quotes
    where id = p_quote_id
      and (seller_id = auth.uid() or public.is_owner())
    for update;

  if not found then
    raise exception 'quote % not found or not authorized', p_quote_id;
  end if;

  if v_quote.status not in ('draft', 'sent') then
    raise exception 'quote_not_convertible: status is %', v_quote.status;
  end if;

  if v_quote.expires_at is not null and v_quote.expires_at < now() then
    raise exception 'quote_expired';
  end if;

  insert into public.sales (seller_id, client_name, client_email, client_phone, status, payment_method, currency)
    values (v_quote.seller_id, v_quote.client_name, v_quote.client_email, v_quote.client_phone, 'pending_payment', 'cash', v_quote.currency)
    returning id into v_sale_id;

  insert into public.sale_items (sale_id, product_id, quantity)
    select v_sale_id, product_id, quantity
    from public.quote_items
    where quote_id = p_quote_id;

  -- Honor the price the client was actually quoted rather than whatever
  -- sale_items_set_pricing just copied from the live products row -- a
  -- quote is a promise of a price, and re-pricing it silently at
  -- conversion time would break that promise if the product price moved
  -- in between.
  update public.sale_items si
    set unit_price = qi.unit_price,
        product_name_snapshot = qi.product_name_snapshot,
        line_total = qi.line_total
    from public.quote_items qi
    where si.sale_id = v_sale_id
      and qi.quote_id = p_quote_id
      and qi.product_id = si.product_id;

  update public.sales
    set subtotal = v_quote.total, total = v_quote.total
    where id = v_sale_id;

  -- Same atomic, row-locked stock decrement every other sale goes
  -- through. auth.uid() inside mark_sale_paid still resolves to the
  -- calling seller's JWT claim despite the SECURITY DEFINER context
  -- change, so its own authorization check still passes correctly. If
  -- this raises (insufficient_stock), the whole function rolls back,
  -- so the quote is left untouched rather than stuck 'converted' with
  -- no paid sale behind it.
  perform public.mark_sale_paid(v_sale_id);

  update public.quotes
    set status = 'converted', converted_sale_id = v_sale_id
    where id = p_quote_id;

  return v_sale_id;
end;
$$;


ALTER FUNCTION "public"."convert_quote_to_sale"("p_quote_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_owner"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  );
$$;


ALTER FUNCTION "public"."is_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_sale_paid"("p_sale_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  item record;
  v_total numeric(12,2);
  v_payment_method text;
  v_commission_pct numeric(5,2);
begin
  select payment_method into v_payment_method from public.sales
    where id = p_sale_id
      and status = 'pending_payment'
      and (seller_id = auth.uid() or public.is_owner() or auth.role() = 'service_role')
    for update;
  if not found then
    raise exception 'sale % not found, not pending payment, or not authorized', p_sale_id;
  end if;

  for item in select * from public.sale_items where sale_id = p_sale_id loop
    update public.product_variants
      set stock_quantity = stock_quantity - item.quantity
      where id = item.variant_id and stock_quantity >= item.quantity;
    if not found then
      raise exception 'insufficient_stock for variant %', item.variant_id;
    end if;

    update public.products
      set units_sold = units_sold + item.quantity
      where id = item.product_id;

    insert into public.inventory_movements (product_id, variant_id, change_qty, reason, reference_id, created_by)
      values (item.product_id, item.variant_id, -item.quantity, 'sale', p_sale_id, auth.uid());
  end loop;

  select coalesce(sum(line_total), 0) into v_total
    from public.sale_items where sale_id = p_sale_id;

  perform set_config('app.allow_sale_status_update', 'true', true);

  if v_payment_method = 'card' then
    select card_commission_pct into v_commission_pct from public.site_settings where id = 1;
    update public.sales
      set status = 'paid', paid_at = now(), subtotal = v_total,
          total = round(v_total * (1 - coalesce(v_commission_pct, 0) / 100), 2)
      where id = p_sale_id;
  else
    update public.sales
      set status = 'paid', paid_at = now(), subtotal = v_total, total = v_total
      where id = p_sale_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."mark_sale_paid"("p_sale_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_deactivate_variant_with_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.is_active = false and old.is_active = true and new.stock_quantity <> 0 then
    raise exception 'variant_has_stock for variant %', new.id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_deactivate_variant_with_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_deactivate_with_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.is_active = false and old.is_active = true then
    if exists (
      select 1 from public.product_variants
      where product_id = new.id and stock_quantity <> 0
    ) then
      raise exception 'product_has_stock for product %', new.id;
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_deactivate_with_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_sales_protected_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if (
    new.seller_id is distinct from old.seller_id or
    new.client_id is distinct from old.client_id or
    new.client_name is distinct from old.client_name or
    new.client_email is distinct from old.client_email or
    new.client_phone is distinct from old.client_phone or
    new.status is distinct from old.status or
    new.payment_method is distinct from old.payment_method or
    new.subtotal is distinct from old.subtotal or
    new.total is distinct from old.total or
    new.currency is distinct from old.currency or
    new.paid_at is distinct from old.paid_at
  ) and coalesce(current_setting('app.allow_sale_status_update', true), '') <> 'true' then
    raise exception 'sales_protected_column_update_denied';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."prevent_sales_protected_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."promote_user"("target_user_id" "uuid", "new_role" "public"."user_role") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  ) then
    raise exception 'only an owner can change user roles';
  end if;

  update public.profiles set role = new_role where id = target_user_id;
end;
$$;


ALTER FUNCTION "public"."promote_user"("target_user_id" "uuid", "new_role" "public"."user_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."report_sales_daily"("p_start" timestamp with time zone, "p_end" timestamp with time zone) RETURNS TABLE("day" "date", "revenue" numeric, "sale_count" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select
    date_trunc('day', paid_at)::date as "day",
    coalesce(sum(total), 0) as revenue,
    count(*) as sale_count
  from public.sales
  where status = 'paid'
    and paid_at >= p_start
    and paid_at < p_end
  group by 1
  order by 1;
$$;


ALTER FUNCTION "public"."report_sales_daily"("p_start" timestamp with time zone, "p_end" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."report_sales_summary"("p_start" timestamp with time zone, "p_end" timestamp with time zone) RETURNS TABLE("total_revenue" numeric, "sale_count" bigint, "average_ticket" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select
    coalesce(sum(total), 0) as total_revenue,
    count(*) as sale_count,
    coalesce(avg(total), 0) as average_ticket
  from public.sales
  where status = 'paid'
    and paid_at >= p_start
    and paid_at < p_end;
$$;


ALTER FUNCTION "public"."report_sales_summary"("p_start" timestamp with time zone, "p_end" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."report_top_products"("p_start" timestamp with time zone, "p_end" timestamp with time zone, "p_limit" integer DEFAULT 10) RETURNS TABLE("product_id" "uuid", "product_name" "text", "units_sold" bigint, "revenue" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select
    si.product_id,
    p.name as product_name,
    sum(si.quantity) as units_sold,
    sum(si.line_total) as revenue
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  join public.products p on p.id = si.product_id
  where s.status = 'paid'
    and s.paid_at >= p_start
    and s.paid_at < p_end
  group by si.product_id, p.name
  order by units_sold desc, revenue desc
  limit p_limit;
$$;


ALTER FUNCTION "public"."report_top_products"("p_start" timestamp with time zone, "p_end" timestamp with time zone, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_quote_item_pricing"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_price numeric(12,2);
  v_name text;
  v_ml int;
  v_product_id uuid;
begin
  select pv.price, pv.milliliters, pv.product_id into v_price, v_ml, v_product_id
    from public.product_variants pv where pv.id = new.variant_id;
  if not found then
    raise exception 'variant % not found', new.variant_id;
  end if;

  select p.name into v_name from public.products p where p.id = v_product_id;

  new.product_id := v_product_id;
  new.unit_price := least(v_price, greatest(0, coalesce(new.unit_price, v_price)));
  new.product_name_snapshot := v_name;
  new.milliliters_snapshot := v_ml;
  new.line_total := new.unit_price * new.quantity;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_quote_item_pricing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_sale_item_pricing"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_price numeric(12,2);
  v_name text;
  v_ml int;
  v_product_id uuid;
begin
  select pv.price, pv.milliliters, pv.product_id into v_price, v_ml, v_product_id
    from public.product_variants pv where pv.id = new.variant_id;
  if not found then
    raise exception 'variant % not found', new.variant_id;
  end if;

  select p.name into v_name from public.products p where p.id = v_product_id;

  new.product_id := v_product_id;
  -- Clamp to [0, catalog price]: a manual discount can only lower the price.
  new.unit_price := least(v_price, greatest(0, coalesce(new.unit_price, v_price)));
  new.product_name_snapshot := v_name;
  new.milliliters_snapshot := v_ml;
  new.line_total := new.unit_price * new.quantity;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_sale_item_pricing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_active"("target_user_id" "uuid", "active" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_owner() then
    raise exception 'Solo un propietario puede activar o desactivar usuarios';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'No puedes desactivar tu propia cuenta';
  end if;

  update public.profiles
  set is_active = active
  where id = target_user_id;
end;
$$;


ALTER FUNCTION "public"."set_user_active"("target_user_id" "uuid", "active" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "street" "text",
    "interior_number" "text",
    "exterior_number" "text",
    "neighborhood" "text",
    "postal_code" "text",
    "municipality" "text",
    "city" "text",
    "state" "text"
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "change_qty" integer NOT NULL,
    "reason" "text" NOT NULL,
    "reference_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "variant_id" "uuid" NOT NULL,
    CONSTRAINT "inventory_movements_reason_check" CHECK (("reason" = ANY (ARRAY['sale'::"text", 'restock'::"text", 'manual_adjustment'::"text", 'refund'::"text"])))
);


ALTER TABLE "public"."inventory_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "provider" "text" DEFAULT 'mercado_pago'::"text" NOT NULL,
    "mp_preference_id" "text",
    "mp_payment_id" "text",
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "amount" numeric(12,2),
    "raw_payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "position" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "milliliters" integer NOT NULL,
    "sku" "text",
    "price" numeric(12,2) NOT NULL,
    "stock_quantity" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "position" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_variants_milliliters_check" CHECK (("milliliters" > 0)),
    CONSTRAINT "product_variants_price_check" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "product_variants_stock_quantity_check" CHECK (("stock_quantity" >= 0))
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "brand" "text",
    "currency" "text" DEFAULT 'MXN'::"text" NOT NULL,
    "category" "text",
    "fragrance_notes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "units_sold" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "products_units_sold_check" CHECK (("units_sold" >= 0))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "email" "text",
    "role" "public"."user_role" DEFAULT 'seller'::"public"."user_role" NOT NULL,
    "phone" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "product_name_snapshot" "text" NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "quantity" integer NOT NULL,
    "line_total" numeric(12,2) NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "milliliters_snapshot" integer NOT NULL,
    CONSTRAINT "quote_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."quote_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "client_name" "text",
    "client_email" "text",
    "client_phone" "text",
    "status" "public"."quote_status" DEFAULT 'draft'::"public"."quote_status" NOT NULL,
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'MXN'::"text" NOT NULL,
    "expires_at" timestamp with time zone,
    "quote_pdf_path" "text",
    "converted_sale_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" "uuid"
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "product_name_snapshot" "text" NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "quantity" integer NOT NULL,
    "line_total" numeric(12,2) NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "milliliters_snapshot" integer NOT NULL,
    CONSTRAINT "sale_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "client_name" "text",
    "client_email" "text",
    "client_phone" "text",
    "status" "public"."sale_status" DEFAULT 'draft'::"public"."sale_status" NOT NULL,
    "payment_method" "text",
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'MXN'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paid_at" timestamp with time zone,
    "client_id" "uuid",
    "sale_pdf_path" "text"
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "id" smallint DEFAULT 1 NOT NULL,
    "banner_message" "text" DEFAULT 'Para hacer tu pedido contactanos via WhatsApp'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "card_commission_pct" numeric(5,2) DEFAULT 3 NOT NULL,
    CONSTRAINT "site_settings_card_commission_pct_check" CHECK ((("card_commission_pct" >= (0)::numeric) AND ("card_commission_pct" <= (100)::numeric))),
    CONSTRAINT "site_settings_singleton" CHECK (("id" = 1))
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_mp_payment_id_key" UNIQUE ("mp_payment_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_milliliters_key" UNIQUE ("product_id", "milliliters");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_clients_created_by" ON "public"."clients" USING "btree" ("created_by");



CREATE INDEX "idx_inventory_movements_created_by" ON "public"."inventory_movements" USING "btree" ("created_by");



CREATE INDEX "idx_inventory_movements_product_id" ON "public"."inventory_movements" USING "btree" ("product_id");



CREATE INDEX "idx_payments_sale_id" ON "public"."payments" USING "btree" ("sale_id");



CREATE INDEX "idx_product_images_product_id" ON "public"."product_images" USING "btree" ("product_id");



CREATE INDEX "idx_quote_items_product_id" ON "public"."quote_items" USING "btree" ("product_id");



CREATE INDEX "idx_quote_items_quote_id" ON "public"."quote_items" USING "btree" ("quote_id");



CREATE INDEX "idx_quotes_client_id" ON "public"."quotes" USING "btree" ("client_id");



CREATE INDEX "idx_quotes_converted_sale_id" ON "public"."quotes" USING "btree" ("converted_sale_id");



CREATE INDEX "idx_quotes_seller_id" ON "public"."quotes" USING "btree" ("seller_id");



CREATE INDEX "idx_sale_items_product_id" ON "public"."sale_items" USING "btree" ("product_id");



CREATE INDEX "idx_sale_items_sale_id" ON "public"."sale_items" USING "btree" ("sale_id");



CREATE INDEX "idx_sales_client_id" ON "public"."sales" USING "btree" ("client_id");



CREATE INDEX "idx_sales_seller_id" ON "public"."sales" USING "btree" ("seller_id");



CREATE INDEX "inventory_movements_variant_id_idx" ON "public"."inventory_movements" USING "btree" ("variant_id");



CREATE INDEX "product_variants_product_id_idx" ON "public"."product_variants" USING "btree" ("product_id");



CREATE UNIQUE INDEX "product_variants_sku_key" ON "public"."product_variants" USING "btree" ("sku") WHERE ("sku" IS NOT NULL);



CREATE INDEX "quote_items_variant_id_idx" ON "public"."quote_items" USING "btree" ("variant_id");



CREATE INDEX "sale_items_variant_id_idx" ON "public"."sale_items" USING "btree" ("variant_id");



CREATE OR REPLACE TRIGGER "payments_set_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "product_variants_prevent_deactivate_with_stock" BEFORE UPDATE ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_deactivate_variant_with_stock"();



CREATE OR REPLACE TRIGGER "product_variants_set_updated_at" BEFORE UPDATE ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "products_prevent_deactivate_with_stock" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_deactivate_with_stock"();



CREATE OR REPLACE TRIGGER "products_set_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "quote_items_set_pricing" BEFORE INSERT ON "public"."quote_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_quote_item_pricing"();



CREATE OR REPLACE TRIGGER "sale_items_set_pricing" BEFORE INSERT ON "public"."sale_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_sale_item_pricing"();



CREATE OR REPLACE TRIGGER "sales_prevent_protected_update" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_sales_protected_update"();



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_converted_sale_id_fkey" FOREIGN KEY ("converted_sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id");



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_delete_owner" ON "public"."clients" FOR DELETE TO "authenticated" USING ("public"."is_owner"());



CREATE POLICY "clients_insert_authenticated" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "clients_select_authenticated" ON "public"."clients" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "clients_update_owner" ON "public"."clients" FOR UPDATE TO "authenticated" USING ("public"."is_owner"()) WITH CHECK ("public"."is_owner"());



ALTER TABLE "public"."inventory_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_movements_select_owner" ON "public"."inventory_movements" FOR SELECT TO "authenticated" USING ("public"."is_owner"());



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_select_own_sale_or_owner" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sales" "s"
  WHERE (("s"."id" = "payments"."sale_id") AND (("s"."seller_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_owner"())))));



ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_images_delete_owner" ON "public"."product_images" FOR DELETE USING ("public"."is_owner"());



CREATE POLICY "product_images_select_authenticated" ON "public"."product_images" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "product_images_select_public" ON "public"."product_images" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE (("p"."id" = "product_images"."product_id") AND ("p"."is_active" = true)))));



CREATE POLICY "product_images_update_owner" ON "public"."product_images" FOR UPDATE USING ("public"."is_owner"()) WITH CHECK ("public"."is_owner"());



CREATE POLICY "product_images_write_owner" ON "public"."product_images" FOR INSERT WITH CHECK ("public"."is_owner"());



ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_variants_delete_owner" ON "public"."product_variants" FOR DELETE USING ("public"."is_owner"());



CREATE POLICY "product_variants_select_authenticated" ON "public"."product_variants" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "product_variants_select_public" ON "public"."product_variants" FOR SELECT TO "anon" USING (("is_active" = true));



CREATE POLICY "product_variants_update_owner" ON "public"."product_variants" FOR UPDATE USING ("public"."is_owner"()) WITH CHECK ("public"."is_owner"());



CREATE POLICY "product_variants_write_owner" ON "public"."product_variants" FOR INSERT WITH CHECK ("public"."is_owner"());



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_delete_owner" ON "public"."products" FOR DELETE USING ("public"."is_owner"());



CREATE POLICY "products_select_authenticated" ON "public"."products" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "products_select_public" ON "public"."products" FOR SELECT TO "anon" USING (("is_active" = true));



CREATE POLICY "products_update_owner" ON "public"."products" FOR UPDATE USING ("public"."is_owner"()) WITH CHECK ("public"."is_owner"());



CREATE POLICY "products_write_owner" ON "public"."products" FOR INSERT WITH CHECK ("public"."is_owner"());



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own_or_owner" ON "public"."profiles" FOR SELECT USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_owner"()));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."quote_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quote_items_insert_own_quote" ON "public"."quote_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quotes"
  WHERE (("quotes"."id" = "quote_items"."quote_id") AND ("quotes"."seller_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "quote_items_select_own_or_owner" ON "public"."quote_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_items"."quote_id") AND (("q"."seller_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_owner"())))));



ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quotes_insert_own" ON "public"."quotes" FOR INSERT WITH CHECK (("seller_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "quotes_select_own_or_owner" ON "public"."quotes" FOR SELECT USING ((("seller_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_owner"()));



CREATE POLICY "quotes_update_own_or_owner" ON "public"."quotes" FOR UPDATE USING ((("seller_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_owner"())) WITH CHECK ((("seller_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_owner"()));



ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sale_items_insert_own_sale" ON "public"."sale_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sales"
  WHERE (("sales"."id" = "sale_items"."sale_id") AND ("sales"."seller_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "sale_items_select_own_or_owner" ON "public"."sale_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sales" "s"
  WHERE (("s"."id" = "sale_items"."sale_id") AND (("s"."seller_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_owner"())))));



ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_insert_own" ON "public"."sales" FOR INSERT WITH CHECK (("seller_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "sales_select_own_or_owner" ON "public"."sales" FOR SELECT USING ((("seller_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_owner"()));



CREATE POLICY "sales_update_own_or_owner" ON "public"."sales" FOR UPDATE USING ((("seller_id" = "auth"."uid"()) OR "public"."is_owner"())) WITH CHECK ((("seller_id" = "auth"."uid"()) OR "public"."is_owner"()));



ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_settings_select_authenticated" ON "public"."site_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "site_settings_select_public" ON "public"."site_settings" FOR SELECT TO "anon" USING (true);



CREATE POLICY "site_settings_update_owner" ON "public"."site_settings" FOR UPDATE USING ("public"."is_owner"()) WITH CHECK ("public"."is_owner"());



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."convert_quote_to_sale"("p_quote_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."convert_quote_to_sale"("p_quote_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_quote_to_sale"("p_quote_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_owner"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_owner"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_sale_paid"("p_sale_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_sale_paid"("p_sale_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_sale_paid"("p_sale_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_deactivate_variant_with_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_deactivate_variant_with_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_deactivate_variant_with_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_deactivate_with_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_deactivate_with_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_deactivate_with_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_sales_protected_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_sales_protected_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_sales_protected_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."promote_user"("target_user_id" "uuid", "new_role" "public"."user_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."promote_user"("target_user_id" "uuid", "new_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."promote_user"("target_user_id" "uuid", "new_role" "public"."user_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."report_sales_daily"("p_start" timestamp with time zone, "p_end" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."report_sales_daily"("p_start" timestamp with time zone, "p_end" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."report_sales_daily"("p_start" timestamp with time zone, "p_end" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."report_sales_summary"("p_start" timestamp with time zone, "p_end" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."report_sales_summary"("p_start" timestamp with time zone, "p_end" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."report_sales_summary"("p_start" timestamp with time zone, "p_end" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."report_top_products"("p_start" timestamp with time zone, "p_end" timestamp with time zone, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."report_top_products"("p_start" timestamp with time zone, "p_end" timestamp with time zone, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."report_top_products"("p_start" timestamp with time zone, "p_end" timestamp with time zone, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_quote_item_pricing"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_quote_item_pricing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_quote_item_pricing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_sale_item_pricing"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_sale_item_pricing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_sale_item_pricing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_user_active"("target_user_id" "uuid", "active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_user_active"("target_user_id" "uuid", "active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_active"("target_user_id" "uuid", "active" boolean) TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_movements" TO "anon";
GRANT ALL ON TABLE "public"."inventory_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_movements" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."product_images" TO "anon";
GRANT ALL ON TABLE "public"."product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."product_images" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."quote_items" TO "anon";
GRANT ALL ON TABLE "public"."quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_items" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."site_settings" TO "anon";
GRANT ALL ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







