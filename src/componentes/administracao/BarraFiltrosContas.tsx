import type { FormEvent } from 'react';
import { CampoBusca, CampoSelecao } from '@/componentes/ui';
import estilos from '@/componentes/usuarios/BarraFiltrosAlteracoes.module.css';
import type { FiltrosContas } from '@/modelos/administracao';
import { TAMANHO_MAXIMO_BUSCA } from '@/regras/buscaConsultas';
import { filtrosSituacaoConta, rotuloFiltroSituacaoConta } from '@/regras/contas';
import { perfis } from '@/regras/permissoesConta';

const opcoesPerfil = perfis.map((definicao) => ({ valor: definicao.perfil, rotulo: definicao.rotulo }));
const opcoesSituacao = filtrosSituacaoConta.map((situacao) => ({ valor: situacao, rotulo: rotuloFiltroSituacaoConta[situacao] }));

interface BarraFiltrosContasProps {
  busca: string;
  filtros: FiltrosContas;
  aoDigitarBusca: (busca: string) => void;
  aoConfirmarBusca: () => void;
  aoMudar: (mudanca: Partial<FiltrosContas>) => void;
}

export function BarraFiltrosContas({ busca, filtros, aoDigitarBusca, aoConfirmarBusca, aoMudar }: BarraFiltrosContasProps) {
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoConfirmarBusca();
  };

  return (
    <div className={estilos.conteiner}>
      <form className={estilos.barra} role="search" aria-label="Filtros dos usuários" onSubmit={enviar}>
        <CampoBusca
          id="busca-contas"
          rotulo="Buscar por nome ou e-mail"
          placeholder="Nome ou e-mail"
          valor={busca}
          aoMudar={aoDigitarBusca}
          maxLength={TAMANHO_MAXIMO_BUSCA}
          atalho="/"
          className={estilos.busca}
        />
        <CampoSelecao
          id="perfil-contas"
          rotulo="Perfil"
          rotuloOculto
          className={estilos.selecao}
          opcoes={opcoesPerfil}
          valor={filtros.perfil}
          aoMudar={(perfil) => aoMudar({ perfil })}
          permitirVazio
          textoVazio="Qualquer perfil"
          textoVazioCurto="Perfil"
        />
        <CampoSelecao
          id="situacao-contas"
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
