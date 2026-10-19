import type { FormEvent } from 'react';
import { CampoBusca, CampoSelecao } from '@/componentes/ui';
import type { FiltrosFuncoes } from '@/modelos/objetos';
import { TAMANHO_MAXIMO_BUSCA } from '@/regras/buscaConsultas';
import { rotuloFiltroSituacaoFuncao, rotuloFiltroTipoFuncao, situacoesFuncao, tiposFuncao } from '@/regras/funcoes';
import estilos from './BarraFiltrosFuncoes.module.css';

const opcoesTipo = tiposFuncao.map((tipo) => ({ valor: tipo, rotulo: rotuloFiltroTipoFuncao[tipo] }));

const opcoesSituacao = situacoesFuncao.map((situacao) => ({
  valor: situacao,
  rotulo: rotuloFiltroSituacaoFuncao[situacao],
}));

interface BarraFiltrosFuncoesProps {
  busca: string;
  filtros: FiltrosFuncoes;
  esquemas: string[];
  linguagens: string[];
  aoDigitarBusca: (busca: string) => void;
  aoConfirmarBusca: () => void;
  aoMudar: (mudanca: Partial<FiltrosFuncoes>) => void;
}

export function BarraFiltrosFuncoes({
  busca,
  filtros,
  esquemas,
  linguagens,
  aoDigitarBusca,
  aoConfirmarBusca,
  aoMudar,
}: BarraFiltrosFuncoesProps) {
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoConfirmarBusca();
  };

  return (
    <div className={estilos.conteiner}>
      <form className={estilos.barra} role="search" aria-label="Filtros das funções" onSubmit={enviar}>
        <CampoBusca
          id="busca-funcoes"
          rotulo="Buscar pelo nome da função, pela descrição, pelos argumentos ou por um trecho do código"
          placeholder="Nome, argumento ou trecho do código"
          valor={busca}
          aoMudar={aoDigitarBusca}
          maxLength={TAMANHO_MAXIMO_BUSCA}
          atalho="/"
          className={estilos.busca}
        />

        <CampoSelecao
          id="tipo-funcoes"
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
          id="esquema-funcoes"
          rotulo="Esquema"
          rotuloOculto
          className={estilos.selecao}
          opcoes={esquemas.map((esquema) => ({ valor: esquema, rotulo: esquema }))}
          valor={filtros.esquema}
          aoMudar={(esquema) => aoMudar({ esquema })}
          permitirVazio
          textoVazio="Qualquer esquema"
          textoVazioCurto="Esquema"
        />

        <CampoSelecao
          id="linguagem-funcoes"
          rotulo="Linguagem"
          rotuloOculto
          className={`${estilos.selecao} ${estilos.linguagem}`}
          opcoes={linguagens.map((linguagem) => ({ valor: linguagem, rotulo: linguagem }))}
          valor={filtros.linguagem}
          aoMudar={(linguagem) => aoMudar({ linguagem })}
          permitirVazio
          textoVazio="Qualquer linguagem"
          textoVazioCurto="Linguagem"
        />

        <CampoSelecao
          id="situacao-funcoes"
          rotulo="Situação"
          rotuloOculto
          className={estilos.selecao}
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
