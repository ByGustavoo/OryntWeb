import type { FormEvent } from 'react';
import { CampoBusca, CampoSelecao } from '@/componentes/ui';
import type { FiltrosAlteracoes } from '@/modelos/alteracoes';
import { TAMANHO_MAXIMO_BUSCA } from '@/regras/buscaConsultas';
import { filtrosResultadoAlteracao, rotuloFiltroResultadoAlteracao } from '@/regras/historicoAlteracoes';
import estilos from './BarraFiltrosAlteracoes.module.css';

const opcoesResultado = filtrosResultadoAlteracao.map((resultado) => ({
  valor: resultado,
  rotulo: rotuloFiltroResultadoAlteracao[resultado],
}));

interface BarraFiltrosAlteracoesProps {
  busca: string;
  filtros: FiltrosAlteracoes;
  papeis: string[];
  aoDigitarBusca: (busca: string) => void;
  aoConfirmarBusca: () => void;
  aoMudar: (mudanca: Partial<FiltrosAlteracoes>) => void;
}

export function BarraFiltrosAlteracoes({ busca, filtros, papeis, aoDigitarBusca, aoConfirmarBusca, aoMudar }: BarraFiltrosAlteracoesProps) {
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoConfirmarBusca();
  };

  return (
    <div className={estilos.conteiner}>
      <form className={estilos.barra} role="search" aria-label="Filtros das alterações" onSubmit={enviar}>
        <CampoBusca
          id="busca-alteracoes"
          rotulo="Buscar nas alterações, nos comandos e na conta"
          placeholder="Papel, objeto, comando ou conta"
          valor={busca}
          aoMudar={aoDigitarBusca}
          maxLength={TAMANHO_MAXIMO_BUSCA}
          atalho="/"
          className={estilos.busca}
        />
        <CampoSelecao
          id="resultado-alteracoes"
          rotulo="Resultado"
          rotuloOculto
          className={estilos.selecao}
          opcoes={opcoesResultado}
          valor={filtros.resultado}
          aoMudar={(resultado) => aoMudar({ resultado })}
          permitirVazio
          textoVazio="Qualquer resultado"
          textoVazioCurto="Resultado"
        />
        <CampoSelecao
          id="papel-alteracoes"
          rotulo="Papel"
          rotuloOculto
          className={estilos.selecao}
          opcoes={papeis.map((papel) => ({ valor: papel, rotulo: papel }))}
          valor={filtros.papel}
          aoMudar={(papel) => aoMudar({ papel })}
          permitirVazio
          textoVazio="Qualquer papel"
          textoVazioCurto="Papel"
        />
      </form>
    </div>
  );
}
