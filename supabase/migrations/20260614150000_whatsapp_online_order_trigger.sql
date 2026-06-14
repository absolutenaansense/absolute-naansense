-- Auto-send every ONLINE order (Renukoot + Renusagar) to the restaurant WhatsApp.
-- Online orders uniquely enter status 'payment_received' (COD on insert, prepaid
-- on payment); POS orders go straight to 'preparing', so this never fires for POS.
-- pg_net posts the order id to the whatsapp-order edge function, which sends the
-- WhatsApp Cloud API template message server-side ("invariably", no client needed).
create extension if not exists pg_net;

create or replace function notify_online_order() returns trigger
language plpgsql security definer as $func$
begin
  if NEW.status = 'payment_received'
     and (TG_OP = 'INSERT' or OLD.status is distinct from 'payment_received') then
    perform net.http_post(
      url := 'https://buzfrumecvpbenbudchb.supabase.co/functions/v1/whatsapp-order',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('orderId', NEW.id)
    );
  end if;
  return NEW;
end;
$func$;

drop trigger if exists trg_notify_online_order on "Order";
create trigger trg_notify_online_order
  after insert or update on "Order"
  for each row execute function notify_online_order();
