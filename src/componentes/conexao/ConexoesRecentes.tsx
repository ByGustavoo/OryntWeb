import { History, X } from 'lucide-react';
import type { ConexaoRecente } from '@/modelos/conexao';
import { formatarTempoRelativo } from '@/utilitarios/formatacao';
import estilos from './ConexoesRecentes.module.css';

interface ConexoesRecentesProps {
  recentes: ConexaoRecente[];
  desabilitado: boolean;
  aoEscolher: (conexao: ConexaoRecente) => void;
  aoRemover: (conexao: ConexaoRecente) => void;
}

function chaveDaConexao(conexao: ConexaoRecente): string {
  return `${conexao.usuario}@${conexao.host}:${conexao.porta}/${conexao.banco}`;
}

export function ConexoesRecentes({ recentes, desabilitado, aoEscolher, aoRemover }: ConexoesRecentesProps) {
  if (recentes.length === 0) return null;

  return (
    <section className={estilos.secao} aria-labelledby="titulo-conexoes-recentes">
      <h2 className={estilos.titulo} id="titulo-conexoes-recentes">
        <History size={14} strokeWidth={2} aria-hidden="true" />
        Conexões recentes
      </h2>
      <ul className={estilos.lista}>
        {recentes.map((conexao) => {
          const endereco = chaveDaConexao(conexao);
          const nome = conexao.nome ?? conexao.banco;
          return (
            <li className={estilos.item} key={endereco}>
              <button
                type="button"
                className={estilos.escolher}
                onClick={() => aoEscolher(conexao)}
                disabled={desabilitado}
                aria-label={`Usar a conexão ${nome}, ${endereco}. A senha precisa ser digitada.`}
              >
                <span className={estilos.nome}>{nome}</span>
                <span className={`${estilos.endereco} codigo`}>{endereco}</span>
                <span className={estilos.quando}>{formatarTempoRelativo(conexao.usadaEm)}</span>
              </button>
              <button
                type="button"
                className={estilos.remover}
                onClick={() => aoRemover(conexao)}
                disabled={desabilitado}
                aria-label={`Remover ${nome} das conexões recentes`}
                title="Remover das recentes"
              >
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className={estilos.nota}>Só os dados de acesso ficam guardados neste navegador. A senha, nunca.</p>
    </section>
  );
}
