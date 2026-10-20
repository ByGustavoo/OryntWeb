import type { FormEvent } from 'react';
import { CampoBusca, CampoSelecao } from '@/componentes/ui';
import type { AutorDTO, FiltrosAuditoria } from '@/modelos/administracao';
import {
  categoriasAuditoria,
  modulosAuditoria,
  periodosAuditoria,
  resultadosAuditoria,
  rotuloCategoriaAuditoria,
  rotuloModuloAuditoria,
  rotuloPeriodoAuditoria,
  rotuloResultadoAuditoria,
} from '@/regras/auditoria';
import { TAMANHO_MAXIMO_BUSCA } from '@/regras/buscaConsultas';
import estilos from './BarraFiltrosAuditoria.module.css';

const opcoesCategoria = categoriasAuditoria.map((valor) => ({ valor, rotulo: rotuloCategoriaAuditoria[valor] }));
const opcoesModulo = modulosAuditoria.map((valor) => ({ valor, rotulo: rotuloModuloAuditoria[valor] }));
const opcoesResultado = resultadosAuditoria.map((valor) => ({ valor, rotulo: rotuloResultadoAuditoria[valor] }));
const opcoesPeriodo = periodosAuditoria.map((valor) => ({ valor, rotulo: rotuloPeriodoAuditoria[valor] }));

interface BarraFiltrosAuditoriaProps {
  busca: string;
  filtros: FiltrosAuditoria;
  contas: AutorDTO[];
  aoDigitarBusca: (busca: string) => void;
  aoConfirmarBusca: () => void;
  aoMudar: (mudanca: Partial<FiltrosAuditoria>) => void;
}

export function BarraFiltrosAuditoria({ busca, filtros, contas, aoDigitarBusca, aoConfirmarBusca, aoMudar }: BarraFiltrosAuditoriaProps) {
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoConfirmarBusca();
  };
  const opcoesConta = contas.flatMap((conta) => (conta.id ? [{ valor: conta.id, rotulo: conta.nome, descricao: conta.email }] : []));

  return (
    <div className={estilos.conteiner}>
      <form className={estilos.barra} role="search" aria-label="Filtros da auditoria" onSubmit={enviar}>
        <CampoBusca
          id="busca-auditoria"
          rotulo="Buscar nos eventos"
          placeholder="Evento, conta, tela ou registro"
          valor={busca}
          aoMudar={aoDigitarBusca}
          maxLength={TAMANHO_MAXIMO_BUSCA}
          atalho="/"
          className={estilos.busca}
        />
        <CampoSelecao
          id="conta-auditoria"
          rotulo="Usuário"
          rotuloOculto
          className={estilos.selecaoLarga}
          opcoes={opcoesConta}
          valor={filtros.conta}
          aoMudar={(conta) => aoMudar({ conta })}
          permitirVazio
          textoVazio="Qualquer usuário"
          textoVazioCurto="Usuário"
        />
        <CampoSelecao
          id="categoria-auditoria"
          rotulo="Tipo de ação"
          rotuloOculto
          className={estilos.selecao}
          opcoes={opcoesCategoria}
          valor={filtros.categoria}
          aoMudar={(categoria) => aoMudar({ categoria })}
          permitirVazio
          textoVazio="Qualquer ação"
          textoVazioCurto="Ação"
        />
        <CampoSelecao
          id="modulo-auditoria"
          rotulo="Módulo"
          rotuloOculto
          className={estilos.selecao}
          opcoes={opcoesModulo}
          valor={filtros.modulo}
          aoMudar={(modulo) => aoMudar({ modulo })}
          permitirVazio
          textoVazio="Qualquer módulo"
          textoVazioCurto="Módulo"
        />
        <CampoSelecao
          id="resultado-auditoria"
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
          id="periodo-auditoria"
          rotulo="Período"
          rotuloOculto
          className={estilos.selecao}
          opcoes={opcoesPeriodo}
          valor={filtros.periodo}
          aoMudar={(periodo) => aoMudar({ periodo })}
          permitirVazio
          textoVazio="Todo o período"
          textoVazioCurto="Período"
        />
      </form>
    </div>
  );
}
