# PetPooja POS integration (Supabase Edge Functions)

Two Edge Functions implement the KOT flow:

| Function | Direction | Purpose |
|---|---|---|
| `petpooja-push` | app → PetPooja | On order **confirm**, POST the order to PetPooja's Save Order API → **KOT prints** |
| `petpooja-callback` | PetPooja → app | On status change (KOT printed / Accepted), set `Order.status = 'preparing'`; later statuses advance it |

Flow: admin confirms → `Order.status` becomes `confirmed` → a Supabase **Database Webhook** invokes `petpooja-push` → PetPooja prints the KOT → PetPooja POSTs status updates to `petpooja-callback` → order auto-advances to `preparing` → `out_for_delivery` → `delivered`.

---

## Prerequisites (from PetPooja — you must obtain these)

Ask PetPooja support / your account manager to enable the **Online Ordering API** integration for your restaurant. They provide:

- `app_key`, `app_secret`, `access_token`, `restID`
- The **Save Order endpoint URL** (and Fetch Menu URL)
- The **status callback spec** (exact field names + status codes)

You give them back: the **callback URL** = your deployed `petpooja-callback` URL (with `?secret=...`).

---

## 1. Apply the migration

Adds `MenuItem.petpoojaItemId`, `Order.petpoojaOrderId`, `Order.petpoojaStatus`.

```bash
supabase db push        # or run supabase/migrations/20260613090000_petpooja_integration.sql
```

## 2. Set function secrets

```bash
supabase secrets set \
  PETPOOJA_APP_KEY=...       PETPOOJA_APP_SECRET=...   PETPOOJA_ACCESS_TOKEN=... \
  PETPOOJA_RESTID=...        PETPOOJA_SAVE_ORDER_URL=https://... \
  PETPOOJA_CALLBACK_URL="https://<project-ref>.functions.supabase.co/petpooja-callback?secret=<random>" \
  PETPOOJA_CALLBACK_SECRET=<random>   PETPOOJA_PUSH_SECRET=<random>
```
(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)

## 3. Deploy

`petpooja-callback` must skip JWT (PetPooja can't send Supabase auth). Either add to
`supabase/config.toml`:

```toml
[functions.petpooja-callback]
verify_jwt = false
[functions.petpooja-push]
verify_jwt = false
```

…or deploy with the flag:

```bash
supabase functions deploy petpooja-push     --no-verify-jwt
supabase functions deploy petpooja-callback --no-verify-jwt
```

## 4. Trigger push on confirm (Database Webhook)

Dashboard → **Database → Webhooks → Create**:
- Table `Order`, events: **UPDATE**
- Type: **Supabase Edge Function** → `petpooja-push`
- HTTP header: `x-webhook-secret: <PETPOOJA_PUSH_SECRET>`

The function ignores everything except the transition into `status = 'confirmed'`.

## 5. Register the callback URL with PetPooja

Give PetPooja the `PETPOOJA_CALLBACK_URL` above. It's also sent per-order as `callback_url` in the Save Order payload.

## 6. Map your menu to PetPooja item IDs

Each `MenuItem.petpoojaItemId` must hold the PetPooja item id, or the KOT push is rejected. Populate via PetPooja's Fetch Menu API (one-time) or manually in the DB.

---

## ⚠️ Verify against PetPooja's doc before going live

The payload shape and status codes follow PetPooja's documented format but **must be reconciled with the spec they send you**. Search the code for `TODO(petpooja)`:

- `_shared/petpooja.ts` → `buildSaveOrderPayload`: `order_type`, `payment_type`, `collect_cash`, tax/discount blocks, and **item `id` = PetPooja item id**.
- `_shared/petpooja.ts` → `mapPetpoojaStatus`: the status string/number → internal status mapping (esp. which status means "KOT printed").
- `petpooja-push` → success flag + returned order-id field name.
- `petpooja-callback` → callback field names + expected ack body.

## Test

```bash
# Simulate a status callback locally / against the deployed function:
curl -X POST "https://<ref>.functions.supabase.co/petpooja-callback?secret=<random>" \
  -H 'Content-Type: application/json' \
  -d '{"restID":"<restID>","orderID":"<an existing Order.id>","status":"Accepted"}'
# -> Order.status should become 'preparing'
```
