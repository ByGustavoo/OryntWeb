import type { FormEvent } from 'react';
import { CampoBusca, CampoSelecao, GrupoOpcoes } from '@/componentes/ui';
import type { FiltrosVisoes, TipoVisao } from '@/modelos/objetos';
import { TAMANHO_MAXIMO_BUSCA } from '@/regras/buscaConsultas';
import { filtrosSituacao, rotuloFiltroSituacao, rotuloFiltroTipoVisao, tiposVisao } from '@/regras/visoes';
import estilos from './BarraFiltrosVisoes.module.css';

const QUALQUER_TIPO = 'TODAS';

type OpcaoTipo = TipoVisao | typeof QUALQUER_TIPO;

const tiposDeVisao = tiposVisao.map((tipo) => ({ valor: tipo, rotulo: rotuloFiltroTipoVisao[tipo] }));

const opcoesTipo: { valor: OpcaoTipo; rotulo: string }[] = [{ valor: QUALQUER_TIPO, rotulo: 'Todas' }, ...tiposDeVisao];

const opcoesSituacao = filtrosSituacao.map((situacao) => ({ valor: situacao, rotulo: rotuloFiltroSituacao[situacao] }));

interface BarraFiltrosVisoesProps {
  busca: string;
  filtros: FiltrosVisoes;
  esquemas: string[];
  aoDigitarBusca: (busca: string) => void;
  aoConfirmarBusca: () => void;
  aoMudar: (mudanca: Partial<FiltrosVisoes>) => void;
}

export function BarraFiltrosVisoes({
  busca,
  filtros,
  esquemas,
  aoDigitarBusca,
  aoConfirmarBusca,
  aoMudar,
}: BarraFiltrosVisoesProps) {
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoConfirmarBusca();
  };

  return (
    <div className={estilos.conteiner}>
      <form className={estilos.barra} role="search" aria-label="Filtros das visões" onSubmit={enviar}>
        <CampoBusca
          id="busca-visoes"
          rotulo="Buscar pelo nome ou pela descrição da visão"
          placeholder="Nome ou descrição"
          valor={busca}
          aoMudar={aoDigitarBusca}
          maxLength={TAMANHO_MAXIMO_BUSCA}
          atalho="/"
          className={estilos.busca}
        />

        <GrupoOpcoes
          rotulo="Tipo de visão"
          opcoes={opcoesTipo}
          valor={filtros.tipo ?? QUALQUER_TIPO}
          aoMudar={(valor) => aoMudar({ tipo: valor === QUALQUER_TIPO ? null : valor })}
          className={estilos.tipoAmplo}
        />

        <CampoSelecao
          id="tipo-visoes"
          rotulo="Tipo de visão"
          rotuloOculto
          className={estilos.tipoCompacto}
          opcoes={tiposDeVisao}
          valor={filtros.tipo}
          aoMudar={(tipo) => aoMudar({ tipo })}
          permitirVazio
          textoVazio="Qualquer tipo"
        />

        <CampoSelecao
          id="esquema-visoes"
          rotulo="Esquema"
          rotuloOculto
          className={estilos.selecao}
          opcoes={esquemas.map((esquema) => ({ valor: esquema, rotulo: esquema }))}
          valor={filtros.esquema}
          aoMudar={(esquema) => aoMudar({ esquema })}
          permitirVazio
          textoVazio="Qualquer esquema"
        />

        <CampoSelecao
          id="situacao-visoes"
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
