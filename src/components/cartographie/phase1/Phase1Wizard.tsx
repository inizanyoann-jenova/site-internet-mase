// src/components/cartographie/phase1/Phase1Wizard.tsx
import type { Session } from '@supabase/supabase-js';
import type { UseCartographieReturn } from '../../../hooks/useCartographie';

interface Props {
  session: Session;
  cartographie: UseCartographieReturn;
}

export default function Phase1Wizard({ session, cartographie }: Props) {
  return null;
}
