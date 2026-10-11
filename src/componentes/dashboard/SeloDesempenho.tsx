import type { LucideIcon } from 'lucide-react';
import { Hourglass, TriangleAlert, Zap } from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { TomSelo } from '@/componentes/ui';
import type { DesempenhoConsulta } from '@/modelos/dashboard';
import { rotuloDesempenho } from '@/modelos/rotulos';

const aparencia: Record<DesempenhoConsulta, { tom: TomSelo; icone: LucideIcon }> = {
  RAPIDA: { tom: 'sucesso', icone: Zap },
  MODERADA: { tom: 'aviso', icone: Hourglass },
  LENTA: { tom: 'erro', icone: TriangleAlert },
};

export function SeloDesempenho({ desempenho }: { desempenho: DesempenhoConsulta }) {
  const { tom, icone } = aparencia[desempenho];
  return (
    <Selo tom={tom} icone={icone}>
      {rotuloDesempenho[desempenho]}
    </Selo>
  );
}
