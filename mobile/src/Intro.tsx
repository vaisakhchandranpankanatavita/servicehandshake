import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { font } from './ui';

/* Mirrors the web splash (src/Intro.jsx): five slides that auto-advance, a masked word reveal,
   Skip, a loading percentage with a progress bar, tap/swipe to advance, and a wipe-up exit. */
const SLIDES = [
  { lines: ['Fixzy.'], note: 'Home services, made simple', bg: '#1d201c', fg: '#f8f8f5', mute: 'rgba(248,248,245,0.55)' },
  { lines: ['Trusted pros', 'for your home.'], note: 'Plumbing, electrical, AC, cleaning and more', bg: '#c9d4aa', fg: '#20231f', mute: 'rgba(32,35,31,0.55)' },
  { lines: ['See the price', 'first.'], note: 'Every service shows its starting price', bg: '#f8f8f5', fg: '#20231f', mute: 'rgba(32,35,31,0.5)' },
  { lines: ['Book a time', 'that suits you.'], note: 'Sign in, request a visit, track it online', bg: '#1d201c', fg: '#f8f8f5', mute: 'rgba(248,248,245,0.55)' },
  { lines: ['Let’s begin.'], note: 'Choose a service on the next screen', bg: '#c9d4aa', fg: '#20231f', mute: 'rgba(32,35,31,0.55)' },
];
const DURATION = 1700;
const LOCK = 450;
const A = Animated.createAnimatedComponent(Text);
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export default function Intro({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [percent, setPercent] = useState(0);
  const [reduce, setReduce] = useState(false);
  const leaving = useRef(false);
  const lock = useRef(0);
  const touchY = useRef<number | null>(null);
  const idx = useRef(0);

  const bg = useRef(new Animated.Value(0)).current; // slide position, drives colours
  const bar = useRef(new Animated.Value(0)).current; // progress fill 0..1
  const wipe = useRef(new Animated.Value(0)).current; // exit
  const states = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current; // 0 next, 1 active, 2 past

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {}); }, []);

  const finish = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    Animated.timing(wipe, { toValue: 1, duration: reduce ? 200 : 800, easing: Easing.bezier(0.77, 0, 0.175, 1), useNativeDriver: true }).start(() => onDone());
  }, [onDone, reduce, wipe]);

  const go = useCallback((dir: number) => {
    if (leaving.current) return;
    const now = Date.now();
    if (now - lock.current < LOCK) return;
    lock.current = now;
    const next = Math.max(0, Math.min(SLIDES.length - 1, idx.current + dir));
    if (dir > 0 && idx.current === SLIDES.length - 1) { finish(); return; }
    idx.current = next;
    setIndex(next);
  }, [finish]);

  // Animate everything toward the current slide.
  useEffect(() => {
    const d = reduce ? 0 : 600;
    Animated.timing(bg, { toValue: index, duration: d, easing: EASE, useNativeDriver: false }).start();
    states.forEach((v, i) => Animated.timing(v, { toValue: i === index ? 1 : i < index ? 2 : 0, duration: reduce ? 0 : i === index ? 650 : 500, delay: i === index && !reduce ? 80 : 0, easing: EASE, useNativeDriver: true }).start());
    bar.stopAnimation();
    Animated.timing(bar, { toValue: (index + 1) / SLIDES.length, duration: DURATION, easing: Easing.linear, useNativeDriver: false }).start();
    const t = setTimeout(() => go(1), DURATION);
    return () => clearTimeout(t);
  }, [index, reduce, bg, bar, states, go]);

  useEffect(() => {
    const id = bar.addListener(({ value }) => setPercent(Math.round(value * 100)));
    return () => bar.removeListener(id);
  }, [bar]);

  const inputs = SLIDES.map((_, i) => i);
  const bgColor = bg.interpolate({ inputRange: inputs, outputRange: SLIDES.map((s) => s.bg) });
  const fgColor = bg.interpolate({ inputRange: inputs, outputRange: SLIDES.map((s) => s.fg) });
  const muteColor = bg.interpolate({ inputRange: inputs, outputRange: SLIDES.map((s) => s.mute) });
  const barWidth = bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const slide = useMemo(() => SLIDES[index], [index]);
  const size = Math.min(72, (width - 48) / 7.6);
  const lineH = size * 0.98;

  return <Animated.View
    accessibilityViewIsModal accessibilityLabel="Welcome to Fixzy"
    style={[StyleSheet.absoluteFill, { zIndex: 1000, backgroundColor: bgColor, transform: [{ translateY: wipe.interpolate({ inputRange: [0, 1], outputRange: [0, -height] }) }] }]}
    onTouchStart={(e) => { touchY.current = e.nativeEvent.pageY; }}
    onTouchEnd={(e) => {
      const dy = (touchY.current ?? 0) - e.nativeEvent.pageY;
      if (Math.abs(dy) > 40) go(dy > 0 ? 1 : -1);
    }}>
    <Pressable style={StyleSheet.absoluteFill} onPress={() => go(1)} accessibilityLabel="Next" accessibilityRole="button" />

    <View pointerEvents="box-none" style={[s.top]}>
      <Animated.Text style={{ color: fgColor, fontFamily: font.heavy, fontSize: 20, letterSpacing: -0.4 }}>Fixzy</Animated.Text>
      <Pressable onPress={finish} hitSlop={14} accessibilityRole="button" accessibilityLabel="Skip intro">
        <Animated.Text style={{ color: muteColor, fontFamily: font.bold, fontSize: 13, letterSpacing: 1.8, textTransform: 'uppercase' }}>Skip</Animated.Text>
      </Pressable>
    </View>

    <View pointerEvents="none" style={s.slides}>
      {SLIDES.map((sl, i) => {
        const st = states[i];
        const lineY = st.interpolate({ inputRange: [0, 1, 2], outputRange: [lineH * 1.15, 0, -lineH * 1.15] });
        const noteOpacity = st.interpolate({ inputRange: [0, 0.9, 1, 1.1, 2], outputRange: [0, 0, 1, 0, 0] });
        const noteY = st.interpolate({ inputRange: [0, 1, 2], outputRange: [14, 0, -14] });
        return <View key={i} style={s.slide} importantForAccessibility={i === index ? 'yes' : 'no-hide-descendants'}>
          {sl.lines.map((line) => <View key={line} style={{ height: lineH, overflow: 'hidden' }}>
            <A style={{ color: fgColor, fontFamily: font.heavy, fontSize: size, lineHeight: lineH, letterSpacing: -size * 0.055, transform: [{ translateY: lineY }] } as any}>{line}</A>
          </View>)}
          <A style={{ marginTop: 28, color: muteColor, fontFamily: font.bold, fontSize: 16, letterSpacing: -0.2, opacity: noteOpacity, transform: [{ translateY: noteY }] } as any}>{sl.note}</A>
        </View>;
      })}
    </View>

    <View pointerEvents="none" style={s.bottom}>
      <View style={s.row}>
        <Animated.Text style={{ color: fgColor, fontFamily: font.bold, fontSize: 14, letterSpacing: 1.8, textTransform: 'uppercase' }}>Loading</Animated.Text>
        <Animated.Text style={{ color: muteColor, fontFamily: font.bold, fontSize: 14, letterSpacing: 1.8, fontVariant: ['tabular-nums'] }}>{percent}%</Animated.Text>
      </View>
      <View style={s.track}><Animated.View style={{ height: 2, width: barWidth, backgroundColor: slide.fg }} /></View>
    </View>
  </Animated.View>;
}

const s = StyleSheet.create({
  top: { position: 'absolute', top: 56, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 },
  slides: { flex: 1, justifyContent: 'center' },
  slide: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 24 },
  bottom: { position: 'absolute', bottom: 44, left: 24, right: 24, gap: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 2, backgroundColor: 'rgba(128,128,128,0.25)', overflow: 'hidden' },
});
