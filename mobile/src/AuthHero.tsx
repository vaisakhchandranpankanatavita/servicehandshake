import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wordmark, useTheme } from './ui';

/* Full-bleed banner behind the sign-in screens: the web home hero, fading into the cream surface
   (the web masks the image out at the bottom the same way). Sits absolutely at the top. */
export default function AuthHero({ ratio = 0.6 }: { ratio?: number }) {
  const { height } = useWindowDimensions();
  const t = useTheme();
  const h = Math.round(height * ratio);
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: h, backgroundColor: t.bg }}>
    <Image source={require('../assets/hero.webp')} resizeMode="cover" accessibilityLabel="A bright living room with a sofa, floor lamp and plant" style={{ width: '100%', height: '100%' }} />
    <LinearGradient colors={['rgba(249,245,242,0)', 'rgba(249,245,242,0.85)', t.bg]} locations={[0.42, 0.8, 1]} style={StyleSheet.absoluteFill} />
    <View style={{ position: 'absolute', top: 52, left: 24 }}><Wordmark size={34} /></View>
  </View>;
}
