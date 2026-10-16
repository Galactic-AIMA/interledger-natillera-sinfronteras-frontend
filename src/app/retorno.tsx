import { Redirect } from 'expo-router';

// natillera://retorno lo atrapa openAuthSessionAsync en la pantalla que abrió la billetera.
// Si el sistema abre la app directamente por este enlace, volvemos a "Mi natillera".
export default function Retorno() {
  return <Redirect href="/natillera" />;
}
