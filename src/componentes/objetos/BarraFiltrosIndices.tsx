import type { FormEvent } from 'react';
import { CampoBusca, CampoSelecao } from '@/componentes/ui';
import type { FiltrosIndices } from '@/modelos/objetos';
import { TAMANHO_MAXIMO_BUSCA } from '@/regras/buscaConsultas';
import { filtrosSituacaoIndice, rotuloFiltroSituacaoIndice } from '@/regras/indices';
import estilos from './BarraFiltrosIndices.module.css';

const opcoesSituacao = filtrosSituacaoIndice.map((situacao) => ({
  valor: situacao,
  rotulo: rotuloFiltroSituacaoIndice[situacao],
}));

interface BarraFiltrosIndicesProps {
  busca: string;
  filtros: FiltrosIndices;
  esquemas: string[];
  tabelas: string[];
  aoDigitarBusca: (busca: string) => void;
  aoConfirmarBusca: () => void;
  aoMudar: (mudanca: Partial<FiltrosIndices>) => void;
}

export function BarraFiltrosIndices({
  busca,
  filtros,
  esquemas,
  tabelas,
  aoDigitarBusca,
  aoConfirmarBusca,
  aoMudar,
}: BarraFiltrosIndicesProps) {
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoConfirmarBusca();
  };

  const mudarEsquema = (esquema: string | null) => {
    const tabelaDeOutroEsquema = esquema !== null && filtros.tabela !== null && !filtros.tabela.startsWith(`${esquema}.`);
    aoMudar(tabelaDeOutroEsquema ? { esquema, tabela: null } : { esquema });
  };

  return (
    <div className={estilos.conteiner}>
      <form className={estilos.barra} role="search" aria-label="Filtros dos índices" onSubmit={enviar}>
        <CampoBusca
          id="busca-indices"
          rotulo="Buscar pelo nome do índice, pela tabela ou pelas colunas"
          placeholder="Índice, tabela ou coluna"
          valor={busca}
          aoMudar={aoDigitarBusca}
          maxLength={TAMANHO_MAXIMO_BUSCA}
          atalho="/"
          className={estilos.busca}
        />

        <CampoSelecao
          id="esquema-indices"
          rotulo="Esquema"
          rotuloOculto
          className={`${estilos.selecao} ${estilos.emPar}`}
          opcoes={esquemas.map((esquema) => ({ valor: esquema, rotulo: esquema }))}
          valor={filtros.esquema}
          aoMudar={mudarEsquema}
          permitirVazio
          textoVazio="Qualquer esquema"
          textoVazioCurto="Esquema"
        />

        <CampoSelecao
          id="tabela-indices"
          rotulo="Tabela"
          rotuloOculto
          className={`${estilos.selecao} ${estilos.emPar}`}
          opcoes={tabelas.map((tabela) => ({ valor: tabela, rotulo: tabela }))}
          valor={filtros.tabela}
          aoMudar={(tabela) => aoMudar({ tabela })}
          permitirVazio
          textoVazio="Qualquer tabela"
          textoVazioCurto="Tabela"
        />

        <CampoSelecao
          id="situacao-indices"
          rotulo="Situação"
          rotuloOculto
          className={estilos.selecao}
          opcoes={opcoesSituacao}
          valor={filtros.situacao}
          aoMudar={(situacao) => aoMudar({ situacao })}
          permitirVazio
          textoVazio="Qualquer situação"
        />
      </form>
    </div>
  );
}
