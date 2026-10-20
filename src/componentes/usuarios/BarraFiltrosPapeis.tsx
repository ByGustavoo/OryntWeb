import type { FormEvent } from 'react';
import { CampoBusca, CampoSelecao } from '@/componentes/ui';
import type { FiltrosPapeis } from '@/modelos/papeis';
import { TAMANHO_MAXIMO_BUSCA } from '@/regras/buscaConsultas';
import {
  atributosPapel,
  rotuloAtributo,
  rotuloFiltroSituacaoPapel,
  rotuloFiltroTipoPapel,
  situacoesPapel,
  tiposPapel,
} from '@/regras/papeis';
import estilos from './BarraFiltrosPapeis.module.css';

const opcoesTipo = tiposPapel.map((tipo) => ({ valor: tipo, rotulo: rotuloFiltroTipoPapel[tipo] }));

const opcoesAtributo = atributosPapel.map((atributo) => ({ valor: atributo, rotulo: rotuloAtributo[atributo] }));

const opcoesSituacao = situacoesPapel.map((situacao) => ({
  valor: situacao,
  rotulo: rotuloFiltroSituacaoPapel[situacao],
}));

interface BarraFiltrosPapeisProps {
  busca: string;
  filtros: FiltrosPapeis;
  aoDigitarBusca: (busca: string) => void;
  aoConfirmarBusca: () => void;
  aoMudar: (mudanca: Partial<FiltrosPapeis>) => void;
}

export function BarraFiltrosPapeis({ busca, filtros, aoDigitarBusca, aoConfirmarBusca, aoMudar }: BarraFiltrosPapeisProps) {
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoConfirmarBusca();
  };

  return (
    <div className={estilos.conteiner}>
      <form className={estilos.barra} role="search" aria-label="Filtros dos papéis" onSubmit={enviar}>
        <CampoBusca
          id="busca-papeis"
          rotulo="Buscar pelo nome do papel ou pela descrição"
          placeholder="Nome ou descrição do papel"
          valor={busca}
          aoMudar={aoDigitarBusca}
          maxLength={TAMANHO_MAXIMO_BUSCA}
          atalho="/"
          className={estilos.busca}
        />

        <CampoSelecao
          id="tipo-papeis"
          rotulo="Tipo"
          rotuloOculto
          className={estilos.selecao}
          opcoes={opcoesTipo}
          valor={filtros.tipo}
          aoMudar={(tipo) => aoMudar({ tipo })}
          permitirVazio
          textoVazio="Qualquer tipo"
          textoVazioCurto="Tipo"
        />

        <CampoSelecao
          id="atributo-papeis"
          rotulo="Atributo"
          rotuloOculto
          className={estilos.selecao}
          opcoes={opcoesAtributo}
          valor={filtros.atributo}
          aoMudar={(atributo) => aoMudar({ atributo })}
          permitirVazio
          textoVazio="Qualquer atributo"
          textoVazioCurto="Atributo"
        />

        <CampoSelecao
          id="situacao-papeis"
          rotulo="Situação"
          rotuloOculto
          className={`${estilos.selecao} ${estilos.situacao}`}
          opcoes={opcoesSituacao}
          valor={filtros.situacao}
          aoMudar={(situacao) => aoMudar({ situacao })}
          permitirVazio
          textoVazio="Qualquer situação"
          textoVazioCurto="Situação"
        />
      </form>
    </div>
  );
}
