import { CampoSelecao } from '@/componentes/ui';
import type { FiltrosHistoricoBackup } from '@/modelos/backup';
import {
  periodosHistoricoBackup,
  rotuloPeriodoHistoricoBackup,
  rotuloSituacaoExecucao,
  situacoesExecucao,
} from '@/regras/backup';
import estilos from './BarraFiltrosHistorico.module.css';

const opcoesPeriodo = periodosHistoricoBackup.map((valor) => ({ valor, rotulo: rotuloPeriodoHistoricoBackup[valor] }));
const opcoesSituacao = situacoesExecucao.map((valor) => ({ valor, rotulo: rotuloSituacaoExecucao[valor] }));

interface BarraFiltrosHistoricoProps {
  filtros: FiltrosHistoricoBackup;
  bancos: string[];
  aoMudar: (mudanca: Partial<FiltrosHistoricoBackup>) => void;
}

export function BarraFiltrosHistorico({ filtros, bancos, aoMudar }: BarraFiltrosHistoricoProps) {
  const opcoesBanco = bancos.map((valor) => ({ valor, rotulo: valor }));

  return (
    <div className={estilos.conteiner}>
      <div className={estilos.barra} role="group" aria-label="Filtros do histórico">
        <CampoSelecao
          id="periodo-historico-backup"
          rotulo="Período"
          rotuloOculto
          opcoes={opcoesPeriodo}
          valor={filtros.periodo}
          aoMudar={(periodo) => aoMudar({ periodo })}
          permitirVazio
          textoVazio="Todo o período"
          textoVazioCurto="Período"
        />
        <CampoSelecao
          id="banco-historico-backup"
          rotulo="Banco"
          rotuloOculto
          opcoes={opcoesBanco}
          valor={filtros.banco}
          aoMudar={(banco) => aoMudar({ banco })}
          permitirVazio
          textoVazio="Qualquer banco"
          textoVazioCurto="Banco"
        />
        <CampoSelecao
          id="situacao-historico-backup"
          rotulo="Status"
          rotuloOculto
          opcoes={opcoesSituacao}
          valor={filtros.situacao}
          aoMudar={(situacao) => aoMudar({ situacao })}
          permitirVazio
          textoVazio="Qualquer status"
          textoVazioCurto="Status"
        />
      </div>
    </div>
  );
}
