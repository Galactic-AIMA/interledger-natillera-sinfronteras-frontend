import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { palette, radius, space } from '@/theme';

type InviteQrProps = { value: string; size?: number };

/** Código QR del enlace de invitación sobre fondo blanco (necesario para que lo lean las cámaras). */
export function InviteQr({ value, size = 220 }: InviteQrProps) {
  return (
    <View style={styles.box} accessible accessibilityRole="image" accessibilityLabel="Código QR de la invitación">
      <QRCode value={value} size={size} color={palette.text} backgroundColor="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'center',
    padding: space.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: palette.borderSoft,
  },
});
