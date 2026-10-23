import { EsqueletoLinhaDoTempo, LinhaDoTempo } from '@/componentes/comum/LinhaDoTempo';
import type { TomDoMarco } from '@/componentes/comum/LinhaDoTempo';
import { Dica } from '@/componentes/ui';
import type { AlteracaoDTO } from '@/modelos/alteracoes';
import { tituloDaAlteracao } from '@/regras/descricaoAlteracoes';
import { estadoDaAlteracao } from '@/regras/historicoAlteracoes';
import type { EstadoDaAlteracao } from '@/regras/historicoAlteracoes';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { iconeDoEstado, SeloEstadoAlteracao } from './SeloEstadoAlteracao';
import estilos from './LinhaDoTempoAlteracoes.module.css';

const tomDoEstado: Record<EstadoDaAlteracao, TomDoMarco> = {
  APLICADA: 'sucesso',
  DESFEITA: 'neutro',
  RECUSADA: 'erro',
};

function textoDosComandos(alteracao: AlteracaoDTO): string {
  const [primeiro] = alteracao.comandos;
  if (alteracao.comandos.length <= 1) return primeiro ?? '';
  return `${primeiro ?? ''} e mais ${formatarNumero(alteracao.comandos.length - 1)} ${pluralizar(alteracao.comandos.length - 1, 'comando', 'comandos')}`;
}

interface LinhaDoTempoAlteracoesProps {
  alteracoes: AlteracaoDTO[];
  geradoEm: string;
  idAberta: string | null;
  rolarAteAberta: boolean;
  aoAbrir: (alteracao: AlteracaoDTO) => void;
}

export function LinhaDoTempoAlteracoes({ alteracoes, geradoEm, idAberta, rolarAteAberta, aoAbrir }: LinhaDoTempoAlteracoesProps) {
  return (
    <LinhaDoTempo
      itens={alteracoes}
      agora={new Date(geradoEm)}
      rotulo="Alterações feitas pelo Orynt nos papéis e nas permissões deste servidor, da mais recente à mais antiga"
      atributo="alteracao"
      idAberto={idAberta}
      rolarAteAberto={rolarAteAberta}
      chave={(alteracao) => alteracao.id}
      instante={(alteracao) => alteracao.feitaEm}
      tom={(alteracao) => tomDoEstado[estadoDaAlteracao(alteracao)]}
      icone={(alteracao) => iconeDoEstado[estadoDaAlteracao(alteracao)]}
      conteudo={(alteracao) => (
        <>
          <span className={estilos.titulo}>{tituloDaAlteracao(alteracao.operacoes, 'PASSADO')}</span>
          <Dica conteudo={alteracao.comandos.join('\n')} soSeCortado larga>
            <span className={`${estilos.comandos} codigo`}>
              {textoDosComandos(alteracao)}
            </span>
          </Dica>
          <span className={estilos.meta}>
            {alteracao.conta || 'Conta não informada'} <span className="codigo">como {alteracao.papelDaConexao}</span>
          </span>
        </>
      )}
      complemento={(alteracao) => <SeloEstadoAlteracao estado={estadoDaAlteracao(alteracao)} />}
      rotuloDaAcao="Ver os comandos desta alteração"
      aoAbrir={aoAbrir}
    />
  );
}

export function EsqueletoLinhaDoTempoAlteracoes({ linhas }: { linhas: number }) {
  return <EsqueletoLinhaDoTempo linhas={linhas} rotulo="Carregando as alterações…" />;
}
