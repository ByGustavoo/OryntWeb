import { Check } from 'lucide-react';
import { IndicadorGiratorio } from '@/componentes/ui';
import type { ConexaoSalvaDTO } from '@/modelos/conexao';
import { enderecoConexao } from '@/regras/conexoesSalvas';
import { formatarTempoRelativo } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './ListaConexoesSalvas.module.css';

interface ListaConexoesSalvasProps {
  rotulo: string;
  conexoes: ConexaoSalvaDTO[];
  idAtiva: string | null;
  idConectando: string | null;
  aoEscolher: (conexao: ConexaoSalvaDTO) => void;
  semMoldura?: boolean;
  className?: string;
}

function descreverSituacao(ativa: boolean, conectando: boolean): string {
  if (ativa) return 'Em uso.';
  return conectando ? 'Conectando.' : 'Conectar.';
}

export function ListaConexoesSalvas({
  rotulo,
  conexoes,
  idAtiva,
  idConectando,
  aoEscolher,
  semMoldura = false,
  className,
}: ListaConexoesSalvasProps) {
  return (
    <ul className={juntarClasses(estilos.lista, semMoldura && estilos.semMoldura, className)} aria-label={rotulo}>
      {conexoes.map((conexao) => {
        const ativa = conexao.id === idAtiva;
        const conectando = conexao.id === idConectando;
        const endereco = enderecoConexao(conexao);
        return (
          <li className={estilos.item} key={conexao.id}>
            <button
              type="button"
              className={juntarClasses(estilos.escolher, ativa && estilos.ativa)}
              onClick={() => aoEscolher(conexao)}
              disabled={idConectando !== null}
              aria-current={ativa ? 'true' : undefined}
              aria-label={`${conexao.nome}, ${endereco}. ${descreverSituacao(ativa, conectando)}`}
            >
              <span className={estilos.nome}>{conexao.nome}</span>
              <span className={estilos.situacao}>
                {conectando ? (
                  <IndicadorGiratorio tamanho={14} />
                ) : ativa ? (
                  <>
                    <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                    Em uso
                  </>
                ) : (
                  formatarTempoRelativo(conexao.ultimoUsoEm)
                )}
              </span>
              <span className={`${estilos.endereco} codigo`}>{endereco}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
