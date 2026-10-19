import { Eye, Layers } from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { TipoVisao } from '@/modelos/objetos';
import { rotuloTipoVisao } from '@/regras/visoes';

export function SeloTipoVisao({ tipo }: { tipo: TipoVisao }) {
  return (
    <Selo tom={tipo === 'MATERIALIZADA' ? 'info' : 'neutro'} icone={tipo === 'MATERIALIZADA' ? Layers : Eye}>
      {rotuloTipoVisao[tipo]}
    </Selo>
  );
}
