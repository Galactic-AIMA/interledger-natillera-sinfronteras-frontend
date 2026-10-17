import type Ionicons from '@expo/vector-icons/Ionicons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type GuideStep = { icon: IconName; title: string; text: string };
export type Guide = { id: GuideId; title: string; icon: IconName; steps: readonly GuideStep[] };

export const GUIDE_IDS = ['cuota', 'recurrente', 'pagar', 'prestamo', 'tesorera', 'metas', 'crear', 'unirse'] as const;
export type GuideId = (typeof GUIDE_IDS)[number];

// Mismos pasos que docs/MANUAL-USUARIO.md, en frases cortas para leer en el celular.
export const GUIDES: Record<GuideId, Guide> = {
  cuota: {
    id: 'cuota',
    title: 'Poner la cuota',
    icon: 'wallet-outline',
    steps: [
      { icon: 'person-outline', title: '¿A nombre de quién?', text: 'Deje «Mía», o elija a otra persona si va a poner la cuota por ella.' },
      { icon: 'receipt-outline', title: 'Revise el resumen', text: 'Vea cuánto sale de su billetera, cuánto llega a la natillera y el costo del envío.' },
      { icon: 'open-outline', title: 'Vaya a su billetera', text: 'Toque «Poner la cuota» y luego «Ir a la billetera». Entre con la cuenta que le indica la app.' },
      { icon: 'finger-print-outline', title: 'Apruebe una sola vez', text: 'Revise el monto y toque «Accept» una sola vez. Si toca «Decline», no sale plata.' },
      { icon: 'checkmark-circle-outline', title: 'Vuelva a la app', text: 'La app se abre sola o con «Volver a la app». En unos segundos verá «Cuota puesta».' },
    ],
  },
  recurrente: {
    id: 'recurrente',
    title: 'Cuota automática',
    icon: 'repeat-outline',
    steps: [
      { icon: 'calendar-outline', title: 'Un permiso, cada mes', text: 'Da el permiso una sola vez y la natillera cobra la cuota cada mes, sin que usted se acuerde.' },
      { icon: 'shield-checkmark-outline', title: 'Revise el tope', text: 'Mire cuánto se cobra, cada cuánto, cuántas veces y lo máximo por cobro. Nunca se cobra más.' },
      { icon: 'open-outline', title: 'Apruebe en su billetera', text: 'Toque «Activar la cuota automática» y apruebe el permiso en su billetera.' },
      { icon: 'checkmark-circle-outline', title: 'Listo', text: 'Al volver verá «Cuota automática activada».' },
    ],
  },
  pagar: {
    id: 'pagar',
    title: 'Pagarle a una persona',
    icon: 'send-outline',
    steps: [
      { icon: 'people-outline', title: '¿A quién?', text: 'Elija una cuenta guardada o toque «+ Cuenta nueva» para guardar la billetera de alguien.' },
      { icon: 'cash-outline', title: '¿Cuánto le llega?', text: 'Escriba lo que debe recibir la otra persona, en su moneda. Espere un segundo.' },
      { icon: 'receipt-outline', title: 'Revise', text: 'La app le muestra cuánto sale de su billetera, en su moneda.' },
      { icon: 'finger-print-outline', title: 'Pague y apruebe', text: 'Toque «Pagar», apruebe una sola vez en su billetera y vuelva a la app.' },
    ],
  },
  prestamo: {
    id: 'prestamo',
    title: 'Pedir un préstamo',
    icon: 'cash-outline',
    steps: [
      { icon: 'calculator-outline', title: 'Cuánto y en cuántas cuotas', text: 'Escriba cuánto necesita y elija de 1 a 12 cuotas. Vea cuánto le llega y cuánto paga por cuota.' },
      { icon: 'paper-plane-outline', title: 'Pídalo', text: 'Toque «Pedir el préstamo».' },
      { icon: 'key-outline', title: 'Autorice las cuotas', text: 'Toque «Autorizar las cuotas» y apruebe en su billetera. Sin este paso la tesorera no puede aprobarlo.' },
      { icon: 'hourglass-outline', title: 'Espere a la tesorera', text: 'Cuando ella lo aprueba, la plata le llega a su billetera, en su moneda.' },
    ],
  },
  tesorera: {
    id: 'tesorera',
    title: 'Aprobar préstamos',
    icon: 'checkmark-done-outline',
    steps: [
      { icon: 'list-outline', title: 'Revise la solicitud', text: 'Mire el monto, las cuotas y que diga «Cuotas autorizadas».' },
      { icon: 'open-outline', title: 'Aprobar', text: 'Toque «Aprobar» y apruebe el envío en la billetera del fondo. La plata sale del fondo a quien pidió.' },
      { icon: 'close-circle-outline', title: 'O rechazar', text: 'Si toca «Rechazar», no sale plata y el permiso de las cuotas queda sin efecto.' },
    ],
  },
  metas: {
    id: 'metas',
    title: 'Metas de la familia',
    icon: 'flag-outline',
    steps: [
      { icon: 'flag-outline', title: 'Ahorro o colecta', text: 'Ahorro: apartan plata del fondo. Colecta: cada quien aporta y la plata le llega directo a quien la necesita.' },
      { icon: 'create-outline', title: 'Cree la meta', text: 'Toque «Nueva meta», diga para qué es, cuánto y para cuándo.' },
      { icon: 'people-outline', title: '¿Cuánto le toca?', text: 'En la meta verá cuánto pone cada uno.' },
      { icon: 'phone-portrait-outline', title: 'Por ahora, en este celular', text: 'Las metas se guardan en este teléfono. Los aportes a una colecta sí son pagos de verdad.' },
    ],
  },
  crear: {
    id: 'crear',
    title: 'Crear una natillera',
    icon: 'add-circle-outline',
    steps: [
      { icon: 'create-outline', title: 'Nombre y moneda', text: 'Escriba el nombre, por ejemplo «Familia Gómez», y elija en qué moneda ahorra.' },
      { icon: 'wallet-outline', title: 'La billetera del fondo', text: 'Escriba la dirección de la billetera donde se junta la plata.' },
      { icon: 'share-social-outline', title: 'Invite a su familia', text: 'Toque «Crear la natillera» y comparta el código por WhatsApp. Usted queda como tesorera.' },
    ],
  },
  unirse: {
    id: 'unirse',
    title: 'Unirse con un código',
    icon: 'key-outline',
    steps: [
      { icon: 'chatbubble-outline', title: 'Pida el código', text: 'La tesorera se lo manda. Se ve así: PALABRA-XXXX-XXXX.' },
      { icon: 'search-outline', title: 'Búsquelo', text: 'Escriba el código y toque «Buscar invitación».' },
      { icon: 'checkmark-circle-outline', title: 'Únase', text: 'Revise el nombre de la natillera y la cuota, y toque «Unirme».' },
    ],
  },
};
