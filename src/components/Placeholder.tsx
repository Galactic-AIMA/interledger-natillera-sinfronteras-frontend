import { AppText } from './AppText';
import { Card } from './Card';
import { Screen } from './Screen';

type PlaceholderProps = {
  screen: string;
  title: string;
  lane: 'cuenta-natillera' | 'pagos' | 'creditos';
  inTabs?: boolean;
};

/** Pantalla provisional del carril `base`: el carril dueño la reemplaza completa. */
export function Placeholder({ screen, title, lane, inTabs }: PlaceholderProps) {
  return (
    <Screen title={title} inTabs={inTabs}>
      <Card title={`Pantalla ${screen}`} tone="soft">
        <AppText>Por construir en el carril «{lane}». Textos en docs/figma-pantallas.md.</AppText>
      </Card>
    </Screen>
  );
}
