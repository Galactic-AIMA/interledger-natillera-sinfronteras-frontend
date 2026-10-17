import { useEffect, useState } from 'react';

import { GuideSheet } from './GuideSheet';
import { markOffered, shouldOffer } from './guideSeen';
import type { GuideId } from './guides';

/**
 * Ofrece la guía la primera vez que la persona entra a un proceso. La pregunta sale una sola vez por
 * proceso en este celular, diga que sí o que no; para repetirla, Ayuda → Guías paso a paso.
 */
export function FirstTimeGuide({ id }: { id: GuideId }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    // Un momento para que la pantalla se vea antes de la pregunta.
    const timer = setTimeout(() => {
      void shouldOffer(id).then((offer) => {
        if (!active || !offer) return;
        markOffered(id);
        setOpen(true);
      });
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id]);

  return <GuideSheet id={open ? id : null} start="offer" onClose={() => setOpen(false)} />;
}
