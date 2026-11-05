import { useState } from 'react';
import { useRouter } from 'expo-router';
import { api } from '../src/api';
import { useCart } from '../src/cart';
import { useSession } from '../src/session';
import { Button, Card, Field, Row, Screen, Txt, money, useTheme } from '../src/ui';

export default function Checkout() {
  const { lines, subtotal, clear } = useCart();
  const { user } = useSession();
  const router = useRouter();
  const t = useTheme();
  const [f, setF] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', address: '', city: '', pin: '', coupon: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const ready = lines.length && f.name.trim() && /^[0-9+\s-]{8,15}$/.test(f.phone) && f.address.trim() && f.city.trim() && /^[0-9]{6}$/.test(f.pin);

  const place = async () => {
    setBusy(true); setErr('');
    try {
      const o = await api('/orders', 'POST', {
        name: f.name.trim(), phone: f.phone, address: f.address.trim(), city: f.city.trim(), pin: f.pin,
        ...(f.coupon.trim() ? { coupon: f.coupon.trim() } : {}),
        items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
      });
      clear();
      router.replace(`/order/${o.id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };

  return <Screen>
    <Card><Row between><Txt muted>{lines.length} item{lines.length === 1 ? '' : 's'}</Txt><Txt bold size={18}>{money(subtotal)}</Txt></Row><Txt muted size={13}>Payment: cash / UPI on delivery</Txt></Card>
    <Field label="Name" value={f.name} onChangeText={set('name')} />
    <Field label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
    <Field label="Address" value={f.address} onChangeText={set('address')} multiline />
    <Field label="City" value={f.city} onChangeText={set('city')} />
    <Field label="PIN code (6 digits)" value={f.pin} onChangeText={set('pin')} keyboardType="number-pad" maxLength={6} />
    <Field label="Coupon code (optional)" value={f.coupon} onChangeText={set('coupon')} autoCapitalize="characters" />
    {!!err && <Txt color={t.bad}>{err}</Txt>}
    <Button title="Place order" onPress={place} busy={busy} disabled={!ready} />
  </Screen>;
}
