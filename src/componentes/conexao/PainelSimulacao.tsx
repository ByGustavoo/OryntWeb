import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import { CampoSelecao } from '@/componentes/ui';
import {
  EVENTO_CENARIO_ALTERADO,
  cenariosConexao,
  definirCenarioConexao,
  lerCenarioConexao,
} from '@/dados/simulacao/controles';
import type { CenarioConexao } from '@/dados/simulacao/controles';
import estilos from './PainelSimulacao.module.css';

export default function PainelSimulacao() {
  const [cenario, setCenario] = useState<CenarioConexao>(lerCenarioConexao);

  useEffect(() => {
    const sincronizar = () => setCenario(lerCenarioConexao());
    window.addEventListener(EVENTO_CENARIO_ALTERADO, sincronizar);
    return () => window.removeEventListener(EVENTO_CENARIO_ALTERADO, sincronizar);
  }, []);

  const escolher = (proximo: CenarioConexao | null) => {
    if (proximo) definirCenarioConexao(proximo);
  };

  return (
    <aside className={estilos.painel} aria-labelledby="titulo-painel-simulacao">
      <p className={estilos.titulo} id="titulo-painel-simulacao">
        <Wrench size={14} strokeWidth={2} aria-hidden="true" />
        Cenário da simulação
        <span className={estilos.marca}>Só em desenvolvimento</span>
      </p>
      <CampoSelecao
        id="cenario-simulacao"
        rotulo="Resultado da próxima tentativa"
        dica="Vale para Conectar e para Testar conexão. Este painel não existe no build de produção."
        opcoes={cenariosConexao.map(({ valor, rotulo, descricao }) => ({ valor, rotulo, descricao }))}
        valor={cenario}
        aoMudar={escolher}
      />
    </aside>
  );
}
