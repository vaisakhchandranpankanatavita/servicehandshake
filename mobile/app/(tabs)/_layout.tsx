import { Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../src/cart';
import { Txt, font, useTheme } from '../../src/ui';

export default function TabsLayout() {
  const t = useTheme();
  const { count } = useCart();
  const router = useRouter();
  const icon = (name: any) => ({ color, size }: { color: any; size: number }) => <Ionicons name={name} color={color} size={size} />;

  return <Tabs screenOptions={{
    tabBarActiveTintColor: t.ink, tabBarInactiveTintColor: t.muted,
    tabBarStyle: { backgroundColor: t.bg, borderTopColor: t.line },
    tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
    headerStyle: { backgroundColor: t.bg }, headerShadowVisible: false, headerTintColor: t.ink, headerTitleStyle: { fontFamily: font.bold, fontSize: 16 },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Services', tabBarIcon: icon('construct-outline') }} />
    <Tabs.Screen name="shop" options={{
      title: 'Shop', tabBarIcon: icon('bag-outline'),
      headerRight: () => <Pressable onPress={() => router.push('/cart')} accessibilityLabel={`Cart, ${count} items`} style={{ marginRight: 16 }}>
        <Ionicons name="cart-outline" size={24} color={t.ink} />
        {count > 0 && <Txt size={11} bold color={t.brandInk} style={{ position: 'absolute', top: -6, right: -8, backgroundColor: t.ink, borderRadius: 9, minWidth: 18, textAlign: 'center', paddingHorizontal: 3, overflow: 'hidden' }}>{count}</Txt>}
      </Pressable>,
    }} />
    <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: icon('receipt-outline') }} />
    <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('person-outline') }} />
  </Tabs>;
}
