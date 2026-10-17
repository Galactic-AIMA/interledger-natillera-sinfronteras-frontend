import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, useAccounts, useApi, useMe, type Amount } from '@/api';
import { AppText, BrandSymbol, Button, Card, Choice, InfoRow, Screen, TextField } from '@/components';
import { antesHref, encodeAmount } from '@/features/pagos/flow';
import { PaymentHistory } from '@/features/pagos/pagar/PaymentHistory';
import { shortAddress } from '@/features/pagos/pagar/shortAddress';
import { FirstTimeGuide } from '@/features/guia/FirstTimeGuide';
import { space } from '@/theme';
import { currencyName, formatAmount, toMinorUnits } from '@/utils/money';
import { useDebouncedValue } from '@/utils/useDebouncedValue';

const NEW_ACCOUNT = '__new__';
const PREVIEW_DEBOUNCE_MS = 600;

// 26 · Pagar: enviar plata a una cuenta guardada con Open Payments (la firma la hace el back).
export default function ScreenPagarIndex() {
  const api = useApi();
  const { data: me } = useMe();
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();

  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const [accountName, setAccountName] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Al volver de guardar una cuenta (27) llega su nombre: se preselecciona si ya está en la lista.
  useEffect(() => {
    const name = Array.isArray(saved) ? saved[0] : saved;
    if (name && accounts?.some((a) => a.customWalletName === name)) setAccountName(name);
  }, [saved, accounts]);

  const selected = accounts?.find((a) => a.customWalletName === accountName) ?? null;
  // El monto va en la moneda de quien RECIBE: el back fija lo que llega y cotiza lo que sale.
  // Con monto fijo en la moneda de quien paga, EUR→COP falla en la cotización (aviso de Ciro, 2026-10-16).
  const asset = selected ?? me;
  const minor = asset ? toMinorUnits(input, asset.assetScale, asset.assetCode) : null;
  const amount: Amount | null = asset && minor ? { value: minor, assetCode: asset.assetCode, assetScale: asset.assetScale } : null;
  const amountError = touched && !amount ? 'Escriba cuánto le debe llegar, un monto mayor a cero.' : null;

  // La vista previa se pide cuando el monto lleva 600 ms quieto, no en cada tecla (aviso del back, 2026-10-17).
  const previewValue = useDebouncedValue(amount?.value ?? null, PREVIEW_DEBOUNCE_MS);
  const previewAmount = amount && previewValue === amount.value ? amount : null;
  const quote = useQuery({
    queryKey: ['quote', api.mode, 'p2p', selected?.customWalletName, previewAmount?.value],
    queryFn: () => (selected && previewAmount ? api.previewQuote({ kind: 'p2p', customWalletName: selected.customWalletName, amount: previewAmount }) : null),
    enabled: Boolean(selected && previewAmount),
  });

  function chooseAccount(value: string) {
    if (value === NEW_ACCOUNT) {
      router.push('/pagar/guardar-cuenta');
      return;
    }
    // Si la cuenta nueva es de otra moneda, el número escrito ya no significa lo mismo.
    const next = accounts?.find((a) => a.customWalletName === value);
    if (next && selected && next.assetCode !== selected.assetCode) setInput('');
    setAccountName(value);
  }

  async function send() {
    setTouched(true);
    if (!selected || !amount) return;
    setSending(true);
    setSendError(null);
    try {
      const start = await api.startPayment({ kind: 'p2p', customWalletName: selected.customWalletName, amount });
      const debit = start.debitAmount ?? quote.data?.debitAmount;
      const receive = start.receiveAmount ?? quote.data?.receiveAmount;
      router.push(
        antesHref({
          kind: 'p2p',
          id: start.paymentId,
          redirectUrl: start.redirectUrl,
          demoTitle: 'Enviar un pago',
          demoDetail: `${selected.customWalletName} va a recibir ${formatAmount(amount)}.`,
          origin: '/pagar',
          debit: encodeAmount(debit),
          receive: encodeAmount(receive),
          counterpart: selected.customWalletName,
        }),
      );
    } catch (e) {
      setSendError(e instanceof ApiError ? e.message : 'No pudimos iniciar el pago. Intente de nuevo.');
    } finally {
      setSending(false);
    }
  }

  const options = [
    ...(accounts ?? []).map((a) => ({ value: a.customWalletName, label: a.customWalletName })),
    { value: NEW_ACCOUNT, label: '+ Cuenta nueva' },
  ];

  const footer = (
    <>
      {sendError ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {sendError}
        </AppText>
      ) : null}
      <Button
        label={selected ? `Enviar a ${selected.customWalletName}` : 'Enviar'}
        onPress={() => void send()}
        loading={sending}
        disabled={!selected}
        accessibilityHint={selected ? undefined : 'Primero elija a quién le envía.'}
      />
    </>
  );

  return (
    <Screen title="Pagar" headerLeft={<BrandSymbol />} inTabs footer={footer}>
      <Card title="Su billetera">
        {me ? (
          <View style={styles.wallet}>
            <AppText variant="amount">{shortAddress(me.walletAddress)}</AppText>
            <AppText tone="muted">{currencyName(me.assetCode)}</AppText>
          </View>
        ) : (
          <AppText tone="muted">Cargando…</AppText>
        )}
      </Card>

      <Card title="1. ¿A quién?">
        {loadingAccounts ? (
          <AppText tone="muted">Cargando sus cuentas…</AppText>
        ) : !accounts || accounts.length === 0 ? (
          <View style={styles.gap}>
            <AppText tone="muted">Todavía no tiene cuentas guardadas. Guarde la de la persona a quien quiere enviarle.</AppText>
            <Button label="+ Cuenta nueva" variant="secondary" onPress={() => router.push('/pagar/guardar-cuenta')} />
          </View>
        ) : (
          <Choice options={options} value={accountName ?? ''} onChange={chooseAccount} label="Elija una cuenta" />
        )}
      </Card>

      <Card title="2. ¿Cuánto le llega?">
        <TextField
          label={asset ? `Monto que recibe, en ${currencyName(asset.assetCode)}` : 'Monto'}
          value={input}
          onChangeText={setInput}
          onBlur={() => setTouched(true)}
          keyboardType="numeric"
          helper={asset?.assetCode === 'COP' ? 'Por ejemplo: 80.000' : 'Por ejemplo: 20,00'}
          mono
          error={amountError}
        />
      </Card>

      <Card title="Resumen">
        {selected && amount ? (
          quote.isLoading ? (
            <AppText tone="muted">Calculando…</AppText>
          ) : quote.data ? (
            <>
              <InfoRow label={`${selected.customWalletName} recibe`} amount={quote.data.receiveAmount} tone="money" />
              <InfoRow label="Sale de su billetera" amount={quote.data.debitAmount} />
            </>
          ) : (
            <AppText tone="muted">Se calcula al confirmar</AppText>
          )
        ) : (
          <AppText tone="muted">Elija a quién y cuánto para ver el resumen.</AppText>
        )}
      </Card>

      <PaymentHistory />
      <FirstTimeGuide id="pagar" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wallet: { gap: space.xs },
  gap: { gap: space.md },
});
