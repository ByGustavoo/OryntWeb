import type { FormEvent } from 'react';
import { CampoBusca, CampoSelecao, Interruptor } from '@/componentes/ui';
import type { FiltrosSessoes } from '@/modelos/sessoes';
import { TAMANHO_MAXIMO_BUSCA } from '@/regras/buscaConsultas';
import { estadosExibidos, rotuloFiltroEstado, rotuloFiltroSituacaoSessao, situacoesSessao } from '@/regras/sessoes';
import estilos from './BarraFiltrosSessoes.module.css';

const opcoesEstado = estadosExibidos.map((estado) => ({ valor: estado, rotulo: rotuloFiltroEstado[estado] }));

const opcoesSituacao = situacoesSessao.map((situacao) => ({ valor: situacao, rotulo: rotuloFiltroSituacaoSessao[situacao] }));

interface BarraFiltrosSessoesProps {
  busca: string;
  filtros: FiltrosSessoes;
  banco: string | null;
  bancoDaConexao: string;
  bancos: string[];
  papeis: string[];
  aoDigitarBusca: (busca: string) => void;
  aoConfirmarBusca: () => void;
  aoMudar: (mudanca: Partial<FiltrosSessoes>) => void;
}

export function BarraFiltrosSessoes({
  busca,
  filtros,
  banco,
  bancoDaConexao,
  bancos,
  papeis,
  aoDigitarBusca,
  aoConfirmarBusca,
  aoMudar,
}: BarraFiltrosSessoesProps) {
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    aoConfirmarBusca();
  };

  const opcoesBanco = bancos.map((nome) => ({
    valor: nome,
    rotulo: nome,
    descricao: nome === bancoDaConexao ? 'O banco da conexão' : undefined,
  }));
  const opcoesPapel = papeis.map((nome) => ({ valor: nome, rotulo: nome }));

  return (
    <div className={estilos.conteiner}>
      <form className={estilos.barra} role="search" aria-label="Filtros das sessões" onSubmit={enviar}>
        <CampoBusca
          id="busca-sessoes"
          rotulo="Buscar pelo PID, papel, aplicação, endereço ou consulta"
          placeholder="PID, papel, aplicação ou SQL"
          valor={busca}
          aoMudar={aoDigitarBusca}
          maxLength={TAMANHO_MAXIMO_BUSCA}
          atalho="/"
          className={estilos.busca}
        />

        <CampoSelecao
          id="banco-sessoes"
          rotulo="Banco"
          rotuloOculto
          className={estilos.selecao}
          opcoes={opcoesBanco}
          valor={banco}
          aoMudar={(escolhido) => aoMudar({ banco: escolhido })}
          permitirVazio
          textoVazio="Qualquer banco"
          textoVazioCurto="Banco"
        />

        <CampoSelecao
          id="estado-sessoes"
          rotulo="Estado"
          rotuloOculto
          className={estilos.selecao}
          opcoes={opcoesEstado}
          valor={filtros.estado}
          aoMudar={(estado) => aoMudar({ estado })}
          permitirVazio
          textoVazio="Qualquer estado"
          textoVazioCurto="Estado"
        />

        <CampoSelecao
          id="situacao-sessoes"
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

        <CampoSelecao
          id="papel-sessoes"
          rotulo="Papel"
          rotuloOculto
          className={estilos.selecao}
          opcoes={opcoesPapel}
          valor={filtros.papel}
          aoMudar={(papel) => aoMudar({ papel })}
          permitirVazio
          textoVazio="Qualquer papel"
          textoVazioCurto="Papel"
        />

        <Interruptor
          ligado={filtros.processos}
          aoMudar={(processos) => aoMudar({ processos })}
          className={estilos.processos}
        >
          Mostrar processos do servidor
        </Interruptor>
      </form>
    </div>
  );
}
