import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components';
import { fonts, palette, radius, space, touch, useTextScale } from '@/theme';

import { flagOf, searchCountries, type Country } from './countries';

type PhoneFieldProps = {
  label: string;
  country: Country;
  onCountryChange: (country: Country) => void;
  number: string;
  onNumberChange: (number: string) => void;
  error?: string;
};

/** Celular con indicativo de país: casilla del país (lista con buscador) + casilla del número. */
export function PhoneField({ label, country, onCountryChange, number, onNumberChange, error }: PhoneFieldProps) {
  const { scale } = useTextScale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCountries(query), [query]);

  function choose(next: Country) {
    onCountryChange(next);
    setOpen(false);
    setQuery('');
  }

  const inputText = { fontFamily: fonts.body, fontSize: 18 * scale };

  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.row}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Indicativo: ${country.name}, más ${country.dial}`}
          accessibilityHint="Abre la lista de países"
          style={({ pressed }) => [styles.country, error ? styles.errorBorder : null, pressed && { backgroundColor: palette.surfaceSoft }]}
        >
          <AppText variant="bodyStrong">{`${flagOf(country.iso)} +${country.dial}`}</AppText>
          <Ionicons name="chevron-down" size={18} color={palette.text} />
        </Pressable>
        <TextInput
          value={number}
          onChangeText={onNumberChange}
          accessibilityLabel={`${label}, número sin indicativo`}
          placeholder={country.iso === 'CO' ? '3001234567' : 'Número'}
          placeholderTextColor={palette.textMuted}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          style={[styles.input, inputText, error ? styles.errorBorder : null]}
        />
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : (
        <AppText variant="caption" tone="muted">
          {`${country.name}. Toque la casilla de la izquierda para cambiar el país.`}
        </AppText>
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <AppText variant="title">Elija el país</AppText>
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
            accessibilityLabel="Buscar país por nombre o indicativo"
            placeholder="Buscar: España, 34, +1…"
            placeholderTextColor={palette.textMuted}
            style={[styles.input, styles.search, inputText]}
          />
          <FlatList
            data={results}
            keyExtractor={(item) => item.iso}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            ListEmptyComponent={
              <AppText variant="body" tone="muted" align="center">
                No encontramos ese país.
              </AppText>
            }
            renderItem={({ item }) => {
              const selected = item.iso === country.iso;
              return (
                <Pressable
                  onPress={() => choose(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${item.name}, más ${item.dial}`}
                  style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && { backgroundColor: palette.surfaceSoft }]}
                >
                  <AppText variant="body" style={styles.flag}>
                    {flagOf(item.iso)}
                  </AppText>
                  <AppText variant={selected ? 'bodyStrong' : 'body'} style={styles.optionName}>
                    {item.name}
                  </AppText>
                  <AppText variant="amount">{`+${item.dial}`}</AppText>
                </Pressable>
              );
            }}
          />
          <Button label="Cerrar" variant="secondary" onPress={() => setOpen(false)} />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.xs },
  row: { flexDirection: 'row', gap: space.sm },
  country: {
    minHeight: touch.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
  },
  input: {
    flex: 1,
    minHeight: touch.buttonHeight,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    backgroundColor: palette.surface,
    color: palette.text,
  },
  errorBorder: { borderColor: palette.danger },
  modal: { flex: 1, gap: space.md, padding: space.lg, backgroundColor: palette.background },
  search: { flex: 0 },
  option: {
    minHeight: touch.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderSoft,
  },
  optionSelected: { backgroundColor: palette.surfaceSoft, borderRadius: radius.sm },
  flag: { fontSize: 24, lineHeight: 30 },
  optionName: { flex: 1 },
});
