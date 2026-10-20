import type { FormEvent } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { BotaoIcone, CampoBusca, CampoSelecao, GrupoOpcoes, Interruptor } from '@/componentes/ui';
import type { OpcaoSelecao } from '@/componentes/ui';
import type { FiltrosPermissoes, ModoPermissoes } from '@/modelos/permissoes';
import { TAMANHO_MAXIMO_BUSCA } from '@/regras/buscaConsultas';
import {
  filtrosDeAcesso,
  filtrosDePapel,
  modosPermissoes,
  rotuloFiltroDeAcesso,
  rotuloFiltroDePapel,
  rotuloFiltroSituacaoPermissao,
  rotuloFiltroTipoObjeto,
  rotuloModoPermissoes,
  situacoesPermissao,
  tiposObjetoPermissao,
} from '@/regras/permissoes';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './BarraPermissoes.module.css';

const opcoesModo = modosPermissoes.map((modo) => ({ valor: modo, rotulo: rotuloModoPermissoes[modo] }));

const opcoesTipoObjeto = tiposObjetoPermissao.map((tipo) => ({ valor: tipo, rotulo: rotuloFiltroTipoObjeto[tipo] }));

const opcoesAcesso = filtrosDeAcesso.map((acesso) => ({ valor: acesso, rotulo: rotuloFiltroDeAcesso[acesso] }));

const opcoesTipoPapel = filtrosDePapel.map((tipo) => ({ valor: tipo, rotulo: rotuloFiltroDePapel[tipo] }));

const opcoesSituacao = situacoesPermissao.map((situacao) => ({
  valor: situacao,
  rotulo: rotuloFiltroSituacaoPermissao[situacao],
}));

const textoDaBusca: Record<ModoPermissoes, { rotulo: string; placeholder: string }> = {
  PAPEL: { rotulo: 'Buscar pelo nome do objeto', placeholder: 'Nome do objeto' },
  OBJETO: { rotulo: 'Buscar pelo nome do papel ou pela descrição', placeholder: 'Nome ou descrição do papel' },
  COMPARACAO: { rotulo: 'Buscar pelo nome do objeto', placeholder: 'Nome do objeto' },
};

interface BarraPermissoesProps {
  busca: string;
  filtros: FiltrosPermissoes;
  papel: string | null;
  objeto: string | null;
  comparado: string | null;
  opcoesPapel: OpcaoSelecao[];
  opcoesComparado: OpcaoSelecao[];
  opcoesObjeto: OpcaoSelecao[];
  esquemas: string[];
  carregando: boolean;
  falhou: boolean;
  aoDigitarBusca: (busca: string) => void;
  aoConfirmarBusca: () => void;
  aoMudar: (mudanca: Partial<FiltrosPermissoes>) => void;
  aoInverter: () => void;
}

export function BarraPermissoes({
  busca,
  filtros,
  papel,
  objeto,
  comparado,
  opcoesPapel,
  opcoesComparado,
  opcoesObjeto,
  esquemas,
  carregando,
  falhou,
  aoDigitarBusca,
  aoConfirmarBusca,
  aoMudar,
  aoInverter,
}: BarraPermissoesProps) {
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoConfirmarBusca();
  };

  const { modo } = filtros;
  const opcoesEsquema = esquemas.map((esquema) => ({ valor: esquema, rotulo: esquema }));

  return (
    <div className={estilos.conteiner}>
      <div className={estilos.selecao}>
        <GrupoOpcoes
          rotulo="Como ver as permissões"
          opcoes={opcoesModo}
          valor={modo}
          aoMudar={(escolhido) => aoMudar({ modo: escolhido })}
          tamanho="sm"
          className={estilos.modos}
        />
        <CampoSelecao
          id="modo-permissoes"
          rotulo="Como ver as permissões"
          rotuloOculto
          className={estilos.modosCompactos}
          opcoes={opcoesModo}
          valor={modo}
          aoMudar={(escolhido) => escolhido && aoMudar({ modo: escolhido })}
        />

        {modo === 'OBJETO' ? (
          <CampoSelecao
            id="objeto-permissoes"
            rotulo="Objeto em análise"
            rotuloOculto
            className={estilos.alvo}
            opcoes={opcoesObjeto}
            valor={objeto}
            aoMudar={(escolhido) => escolhido && aoMudar({ objeto: escolhido })}
            textoVazio={falhou ? 'Objetos indisponíveis' : 'Carregando os objetos…'}
            desabilitado={carregando}
          />
        ) : (
          <div className={juntarClasses(estilos.papeis, modo === 'COMPARACAO' && estilos.comparando)}>
            <CampoSelecao
              id="papel-permissoes"
              rotulo={modo === 'COMPARACAO' ? 'Primeiro papel' : 'Papel em análise'}
              rotuloOculto
              className={estilos.alvo}
              opcoes={modo === 'COMPARACAO' ? opcoesComparado : opcoesPapel}
              valor={papel}
              aoMudar={(escolhido) => escolhido && aoMudar({ papel: escolhido })}
              textoVazio={falhou ? 'Papéis indisponíveis' : 'Carregando os papéis…'}
              desabilitado={carregando}
            />
            {modo === 'COMPARACAO' ? (
              <>
                <BotaoIcone
                  icone={ArrowLeftRight}
                  rotulo="Inverter os dois papéis"
                  variante="secundario"
                  className={estilos.inverter}
                  aria-disabled={carregando ? true : undefined}
                  onClick={() => !carregando && aoInverter()}
                />
                <CampoSelecao
                  id="comparado-permissoes"
                  rotulo="Comparar com"
                  rotuloOculto
                  className={estilos.alvo}
                  opcoes={opcoesComparado.filter((opcao) => opcao.valor !== papel)}
                  valor={comparado}
                  aoMudar={(escolhido) => escolhido && aoMudar({ comparado: escolhido })}
                  textoVazio="Escolha um papel"
                  desabilitado={carregando}
                />
              </>
            ) : null}
          </div>
        )}
      </div>

      <form className={estilos.barra} role="search" aria-label="Filtros das permissões" onSubmit={enviar}>
        <CampoBusca
          id="busca-permissoes"
          rotulo={textoDaBusca[modo].rotulo}
          placeholder={textoDaBusca[modo].placeholder}
          valor={busca}
          aoMudar={aoDigitarBusca}
          maxLength={TAMANHO_MAXIMO_BUSCA}
          atalho="/"
          className={estilos.busca}
        />

        {modo === 'OBJETO' ? (
          <CampoSelecao
            id="tipo-papel-permissoes"
            rotulo="Tipo de papel"
            rotuloOculto
            className={estilos.filtro}
            opcoes={opcoesTipoPapel}
            valor={filtros.tipoPapel}
            aoMudar={(tipoPapel) => aoMudar({ tipoPapel })}
            permitirVazio
            textoVazio="Qualquer tipo"
            textoVazioCurto="Tipo"
          />
        ) : (
          <>
            <CampoSelecao
              id="esquema-permissoes"
              rotulo="Esquema"
              rotuloOculto
              className={estilos.filtro}
              opcoes={opcoesEsquema}
              valor={filtros.esquema}
              aoMudar={(esquema) => aoMudar({ esquema })}
              permitirVazio
              textoVazio="Qualquer esquema"
              textoVazioCurto="Esquema"
            />
            <CampoSelecao
              id="tipo-objeto-permissoes"
              rotulo="Tipo de objeto"
              rotuloOculto
              className={estilos.filtro}
              opcoes={opcoesTipoObjeto}
              valor={filtros.tipoObjeto}
              aoMudar={(tipoObjeto) => aoMudar({ tipoObjeto })}
              permitirVazio
              textoVazio="Qualquer objeto"
              textoVazioCurto="Objeto"
            />
          </>
        )}

        {modo === 'COMPARACAO' ? (
          <Interruptor
            ligado={filtros.soDiferencas}
            aoMudar={(soDiferencas) => aoMudar({ soDiferencas })}
            className={estilos.interruptor}
          >
            Só as diferenças
          </Interruptor>
        ) : (
          <>
            <CampoSelecao
              id="acesso-permissoes"
              rotulo="Acesso"
              rotuloOculto
              className={estilos.filtro}
              opcoes={opcoesAcesso}
              valor={filtros.acesso}
              aoMudar={(acesso) => aoMudar({ acesso })}
              permitirVazio
              textoVazio="Com algum acesso"
              textoVazioCurto="Acesso"
            />
            <CampoSelecao
              id="situacao-permissoes"
              rotulo="Situação"
              rotuloOculto
              className={juntarClasses(estilos.filtro, estilos.situacao)}
              opcoes={opcoesSituacao}
              valor={filtros.situacao}
              aoMudar={(situacao) => aoMudar({ situacao })}
              permitirVazio
              textoVazio="Qualquer situação"
              textoVazioCurto="Situação"
            />
          </>
        )}
      </form>
    </div>
  );
}
