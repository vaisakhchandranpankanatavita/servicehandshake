import { Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import { img } from '../src/api';
import { useCart } from '../src/cart';
import { Button, Card, Chip, Row, Screen, Txt, money, useTheme } from '../src/ui';

export default function Cart() {
  const { lines, subtotal, setQty } = useCart();
  const router = useRouter();
  const t = useTheme();

  if (!lines.length) return <Screen>
    <Txt muted style={{ textAlign: 'center', marginTop: 40 }}>Your cart is empty.</Txt>
    <Button title="Browse the shop" kind="ghost" onPress={() => router.replace('/shop')} />
  </Screen>;

  return <Screen>
    {lines.map(({ product: p, qty }) => <Card key={p.id}>
      <Row>
        <Image source={{ uri: img(p.img) }} style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: t.idleBg }} accessibilityLabel={p.name} />
        <View style={{ flex: 1 }}><Txt bold numberOfLines={2}>{p.name}</Txt><Txt muted>{money(p.price)}</Txt></View>
      </Row>
      <Row between>
        <Row><Chip title="−" onPress={() => setQty(p.id, qty - 1)} /><Txt bold>{qty}</Txt><Chip title="+" onPress={() => setQty(p.id, qty + 1)} disabled={qty >= 20} /></Row>
        <Txt bold>{money(p.price * qty)}</Txt>
      </Row>
    </Card>)}
    <Card><Row between><Txt muted>Subtotal</Txt><Txt bold size={18}>{money(subtotal)}</Txt></Row><Txt muted size={13}>Coupons are applied at checkout. Pay on delivery.</Txt></Card>
    <Button title="Checkout" onPress={() => router.push('/checkout')} />
  </Screen>;
}
