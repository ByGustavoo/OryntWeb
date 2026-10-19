import type { FormEvent } from 'react';
import { CampoBusca, CampoSelecao } from '@/componentes/ui';
import type { FiltrosTabelas } from '@/modelos/objetos';
import { TAMANHO_MAXIMO_BUSCA } from '@/regras/buscaConsultas';
import { rotuloFiltroSituacaoTabela, situacoesTabela } from '@/regras/tabelas';
import estilos from './BarraFiltrosTabelas.module.css';

const opcoesSituacao = situacoesTabela.map((situacao) => ({
  valor: situacao,
  rotulo: rotuloFiltroSituacaoTabela[situacao],
}));

interface BarraFiltrosTabelasProps {
  busca: string;
  filtros: FiltrosTabelas;
  esquemas: string[];
  aoDigitarBusca: (busca: string) => void;
  aoConfirmarBusca: () => void;
  aoMudar: (mudanca: Partial<FiltrosTabelas>) => void;
}

export function BarraFiltrosTabelas({
  busca,
  filtros,
  esquemas,
  aoDigitarBusca,
  aoConfirmarBusca,
  aoMudar,
}: BarraFiltrosTabelasProps) {
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoConfirmarBusca();
  };

  return (
    <div className={estilos.conteiner}>
      <form className={estilos.barra} role="search" aria-label="Filtros das tabelas" onSubmit={enviar}>
        <CampoBusca
          id="busca-tabelas"
          rotulo="Buscar pelo nome da tabela, pela descrição ou pelas colunas"
          placeholder="Tabela, descrição ou coluna"
          valor={busca}
          aoMudar={aoDigitarBusca}
          maxLength={TAMANHO_MAXIMO_BUSCA}
          atalho="/"
          className={estilos.busca}
        />

        <CampoSelecao
          id="esquema-tabelas"
          rotulo="Esquema"
          rotuloOculto
          className={estilos.esquema}
          opcoes={esquemas.map((esquema) => ({ valor: esquema, rotulo: esquema }))}
          valor={filtros.esquema}
          aoMudar={(esquema) => aoMudar({ esquema })}
          permitirVazio
          textoVazio="Qualquer esquema"
        />

        <CampoSelecao
          id="situacao-tabelas"
          rotulo="Situação"
          rotuloOculto
          className={estilos.situacao}
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
