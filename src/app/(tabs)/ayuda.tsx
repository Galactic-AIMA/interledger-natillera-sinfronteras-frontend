import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useMyNatillera } from '@/api';
import { AppText, Card, Screen } from '@/components';
import { palette, radius, space, touch } from '@/theme';
import { formatAmount } from '@/utils/money';

type Question = { id: string; question: string; answer: string };

// 35 · Ayuda — respuestas fijas locales, sin backend.
export default function ScreenAyuda() {
  const { data: natillera, isLoading } = useMyNatillera();
  const [openId, setOpenId] = useState<string | null>(null);

  const howMuch = isLoading
    ? 'Estamos buscando su cifra…'
    : natillera
      ? `Hasta hoy usted ha puesto ${formatAmount(natillera.myTotal)} en ${natillera.natilleraName}. Entre todos llevan ${formatAmount(natillera.fundTotal)}.`
      : 'Todavía no tiene natillera. Cuando ponga su primera cuota, aquí verá cuánto lleva.';

  const questions: Question[] = [
    { id: 'llevo', question: '¿Cuánto llevo?', answer: howMuch },
    {
      id: 'comision',
      question: 'Explícame la comisión',
      answer:
        'Es el costo del envío entre billeteras. Antes de pagar, la app le muestra cuánto sale de su billetera, cuánto llega y cuánto cuesta el envío. Nada se cobra sin que usted lo apruebe.',
    },
    {
      id: 'permiso',
      question: '¿Qué es el permiso de la billetera?',
      answer:
        'Su billetera es otra app y es la única que puede mover su plata. Antes de cada pago le pide permiso: usted revisa cuánto sale y cuánto llega, y toca «Aprobar». Si toca «Rechazar», no sale plata.',
    },
    {
      id: 'prestamo',
      question: '¿Cómo funciona el préstamo?',
      answer:
        'Usted pide un monto y elige en cuántas cuotas lo devuelve. Da el permiso para cobrar las cuotas una sola vez. La tesorera decide si lo aprueba; si lo aprueba, el fondo le envía la plata y las cuotas se cobran solas. Cada cuota tiene interés y abono a capital.',
    },
  ];

  return (
    <Screen title="Ayuda" inTabs>
      <Card tone="soft">
        <AppText variant="bodyStrong">Hola. Pregúnteme cómo funciona algo.</AppText>
      </Card>
      <View style={styles.list}>
        {questions.map((q) => {
          const open = openId === q.id;
          return (
            <View key={q.id} style={styles.item}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={q.question}
                accessibilityState={{ expanded: open }}
                onPress={() => setOpenId(open ? null : q.id)}
                style={({ pressed }) => [styles.question, pressed && { backgroundColor: palette.surfaceSoft }]}
              >
                <AppText variant="bodyStrong" style={styles.questionText}>
                  {q.question}
                </AppText>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={24} color={palette.text} />
              </Pressable>
              {open ? (
                <View style={styles.answer}>
                  <AppText>{q.answer}</AppText>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  item: { borderRadius: radius.lg, borderWidth: 1.5, borderColor: palette.borderSoft, backgroundColor: palette.surface, overflow: 'hidden' },
  question: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: touch.buttonHeight, padding: space.lg },
  questionText: { flex: 1 },
  answer: { paddingHorizontal: space.lg, paddingBottom: space.lg },
});
