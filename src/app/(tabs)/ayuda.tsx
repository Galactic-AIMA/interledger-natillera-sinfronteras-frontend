import type Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { useMe, useMyNatillera } from '@/api';
import { AppText, BrandSymbol, Button, Card, Screen, SLOGAN } from '@/components';
import { FaqItem } from '@/features/ayuda/FaqItem';
import { fonts, space } from '@/theme';
import { formatAmount } from '@/utils/money';
import { firstName } from '@/utils/names';

type Question = { id: string; icon: IconName; question: string; answer: string };

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// 35 · Ayuda — respuestas fijas locales, sin backend.
export default function ScreenAyuda() {
  const { data: natillera, isLoading } = useMyNatillera();
  const { data: me } = useMe();
  const [openId, setOpenId] = useState<string | null>(null);

  const howMuch = isLoading
    ? 'Estamos buscando su cifra…'
    : natillera
      ? `Hasta hoy usted ha puesto ${formatAmount(natillera.myTotal)} en ${natillera.natilleraName}. Entre todos llevan ${formatAmount(natillera.fundTotal)}.`
      : 'Todavía no tiene natillera. Cuando ponga su primera cuota, aquí verá cuánto lleva.';

  const questions: Question[] = [
    { id: 'llevo', icon: 'wallet-outline', question: '¿Cuánto llevo?', answer: howMuch },
    {
      id: 'comision',
      icon: 'swap-horizontal-outline',
      question: 'Explíqueme el costo del envío',
      answer:
        'Es el costo del envío entre billeteras. Antes de pagar, la app le muestra cuánto sale de su billetera, cuánto llega y cuánto cuesta el envío. Nada se cobra sin que usted lo apruebe.',
    },
    {
      id: 'permiso',
      icon: 'shield-checkmark-outline',
      question: '¿Qué es el permiso de la billetera?',
      answer:
        'Su billetera es otra app y es la única que puede mover su plata. Antes de cada pago le pide permiso: usted revisa cuánto sale y cuánto llega, y toca «Aprobar». Si toca «Rechazar», no sale plata.',
    },
    {
      id: 'prestamo',
      icon: 'cash-outline',
      question: '¿Cómo funciona el préstamo?',
      answer:
        'Usted pide un monto y elige en cuántas cuotas lo devuelve. Da el permiso para cobrar las cuotas una sola vez. La tesorera decide si lo aprueba; si lo aprueba, el fondo le envía la plata y las cuotas se cobran solas. Cada cuota tiene interés y abono a capital.',
    },
  ];

  // Primer nombre si lo hay; si no, saludo sin nombre.
  const name = firstName(me?.displayName);
  const greeting = name ? `Hola, ${name}.` : 'Hola.';

  const shareCode = () => {
    if (!natillera) return;
    void Share.share({
      message: `Le invito a mi natillera «${natillera.natilleraName}». Con este código puede unirse: ${natillera.invitationCode}`,
    });
  };

  return (
    <Screen title="Ayuda" inTabs headerLeft={<BrandSymbol />}>
      <View style={styles.greeting}>
        <AppText variant="title" accessibilityRole="header">
          {greeting}
        </AppText>
        <AppText tone="muted">Aquí estamos para lo que necesite.</AppText>
      </View>
      <View style={styles.list}>
        {questions.map((q) => (
          <FaqItem
            key={q.id}
            icon={q.icon}
            question={q.question}
            answer={q.answer}
            open={openId === q.id}
            onToggle={() => setOpenId(openId === q.id ? null : q.id)}
          />
        ))}
      </View>
      {natillera ? (
        <Card title="Su natillera" tone="soft">
          <View style={styles.codeBlock}>
            <AppText variant="bodyStrong">{natillera.natilleraName}</AppText>
            <AppText tone="muted" variant="caption">
              Código de invitación
            </AppText>
            <AppText
              style={styles.code}
              selectable
              accessibilityLabel={`Código de invitación: ${natillera.invitationCode.split('').join(' ')}`}
            >
              {natillera.invitationCode}
            </AppText>
            <Button
              label="Compartir código"
              variant="secondary"
              onPress={shareCode}
              accessibilityHint="Abre las opciones para enviar el código a un familiar"
            />
          </View>
        </Card>
      ) : null}
      <View style={styles.footer}>
        <BrandSymbol size={56} />
        <AppText tone="muted" align="center">
          {SLOGAN}
        </AppText>
        <AppText variant="caption" tone="muted" align="center">
          Natillera sin Fronteras
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: space.xs },
  list: { gap: space.md },
  codeBlock: { gap: space.sm },
  code: { fontFamily: fonts.monoBold, fontSize: 28, lineHeight: 36, letterSpacing: 1 },
  footer: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
});
