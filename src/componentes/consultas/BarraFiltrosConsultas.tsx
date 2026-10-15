import type { FormEvent } from 'react';
import { CampoBusca, CampoSelecao, GrupoOpcoes } from '@/componentes/ui';
import type { FiltrosConsultas } from '@/modelos/consultas';
import type { DesempenhoConsulta } from '@/modelos/dashboard';
import { desempenhosConsulta, rotuloFaixaDesempenho, rotuloTipoComando, tiposComando } from '@/modelos/rotulos';
import { TAMANHO_MAXIMO_BUSCA } from '@/regras/buscaConsultas';
import type { PadraoNumerico } from '@/regras/exportacaoRelatorio';
import { MenuExportarCsv } from './MenuExportarCsv';
import estilos from './BarraFiltrosConsultas.module.css';

const QUALQUER_DESEMPENHO = 'TODAS';

type OpcaoDesempenho = DesempenhoConsulta | typeof QUALQUER_DESEMPENHO;

const faixasDeDesempenho = desempenhosConsulta.map((desempenho) => ({
  valor: desempenho,
  rotulo: rotuloFaixaDesempenho[desempenho],
}));

const opcoesDesempenho: { valor: OpcaoDesempenho; rotulo: string }[] = [
  { valor: QUALQUER_DESEMPENHO, rotulo: 'Todas' },
  ...faixasDeDesempenho,
];

const opcoesTipo = tiposComando.map((tipo) => ({ valor: tipo, rotulo: rotuloTipoComando[tipo] }));

interface BarraFiltrosConsultasProps {
  busca: string;
  filtros: FiltrosConsultas;
  exportando: boolean;
  podeExportar: boolean;
  aoDigitarBusca: (busca: string) => void;
  aoConfirmarBusca: () => void;
  aoMudar: (mudanca: Partial<FiltrosConsultas>) => void;
  aoExportar: (padrao: PadraoNumerico) => void;
}

export function BarraFiltrosConsultas({
  busca,
  filtros,
  exportando,
  podeExportar,
  aoDigitarBusca,
  aoConfirmarBusca,
  aoMudar,
  aoExportar,
}: BarraFiltrosConsultasProps) {
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoConfirmarBusca();
  };

  return (
    <div className={estilos.conteiner}>
      <form className={estilos.barra} role="search" aria-label="Filtros das consultas" onSubmit={enviar}>
        <CampoBusca
          id="busca-consultas"
          rotulo="Buscar no texto das consultas"
          placeholder="Buscar no texto do SQL"
          valor={busca}
          aoMudar={aoDigitarBusca}
          maxLength={TAMANHO_MAXIMO_BUSCA}
          atalho="/"
          className={estilos.busca}
        />

        <GrupoOpcoes
          rotulo="Desempenho"
          opcoes={opcoesDesempenho}
          valor={filtros.desempenho ?? QUALQUER_DESEMPENHO}
          aoMudar={(valor) => aoMudar({ desempenho: valor === QUALQUER_DESEMPENHO ? null : valor })}
          className={estilos.desempenhoAmplo}
        />

        <CampoSelecao
          id="desempenho-consultas"
          rotulo="Desempenho"
          rotuloOculto
          className={estilos.desempenhoCompacto}
          opcoes={faixasDeDesempenho}
          valor={filtros.desempenho}
          aoMudar={(desempenho) => aoMudar({ desempenho })}
          permitirVazio
          textoVazio="Qualquer desempenho"
        />

        <CampoSelecao
          id="tipo-consultas"
          rotulo="Tipo de comando"
          rotuloOculto
          className={estilos.tipo}
          opcoes={opcoesTipo}
          valor={filtros.tipo}
          aoMudar={(tipo) => aoMudar({ tipo })}
          permitirVazio
          textoVazio="Qualquer comando"
        />

        <MenuExportarCsv
          className={estilos.exportar}
          exportando={exportando}
          desabilitado={!podeExportar}
          aoExportar={aoExportar}
        />
      </form>
    </div>
  );
}
