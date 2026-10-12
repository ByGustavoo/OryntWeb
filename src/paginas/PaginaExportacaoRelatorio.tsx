import { useEffect, useMemo, useState } from 'react';
import { FileX2, FlaskConical } from 'lucide-react';
import { ehErroApi } from '@/api/tratamentoErros';
import { PainelSemConexao } from '@/componentes/conexao/PainelSemConexao';
import { CabecalhoPagina } from '@/componentes/layout/CabecalhoPagina';
import { BarraPeriodo } from '@/componentes/relatorios/BarraPeriodo';
import { OpcoesExportacao } from '@/componentes/relatorios/OpcoesExportacao';
import { PreviaExportacao } from '@/componentes/relatorios/PreviaExportacao';
import { ConteudoAssincrono, Esqueleto, EstadoVazio, Nota, Painel } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { usePeriodoRelatorio } from '@/ganchos/usePeriodoRelatorio';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { ConexaoDTO } from '@/modelos/conexao';
import type { ResumoRelatorioDTO } from '@/modelos/relatorios';
import { useConexao } from '@/provedores/ProvedorConexao';
import type { SituacaoConexao } from '@/provedores/ProvedorConexao';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import {
  blocosExportacao,
  contarLinhas,
  gerarArquivos,
  gerarTextoParaColar,
} from '@/regras/exportacaoRelatorio';
import type { BlocoExportacao, FormatoExportacao, PadraoNumerico } from '@/regras/exportacaoRelatorio';
import { periodoNaFrase } from '@/regras/periodoRelatorio';
import { caminhos } from '@/rotas/caminhos';
import { servicoRelatorios } from '@/servicos';
import { baixarArquivos } from '@/utilitarios/download';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './PaginaExportacaoRelatorio.module.css';

const TITULO = 'Exportação';

function descreverSemConexao(situacao: SituacaoConexao): string {
  if (situacao === 'DESCONECTADA') return 'Conecte um banco para exportar o resumo de um período.';
  if (situacao === 'INDISPONIVEL') return 'O Orynt não conseguiu confirmar a conexão com o banco.';
  return 'Preparando a conexão com o banco.';
}

export default function PaginaExportacaoRelatorio() {
  useTituloDocumento('Relatórios: Exportação');
  const { situacao, conexao } = useConexao();

  if (!conexao) {
    return (
      <>
        <CabecalhoPagina titulo={TITULO} descricao={descreverSemConexao(situacao)} />
        <PainelSemConexao />
      </>
    );
  }

  return <ExportacaoConectada key={conexao.id} conexao={conexao} />;
}

function ExportacaoConectada({ conexao }: { conexao: ConexaoDTO }) {
  const { marcarDesconectada } = useConexao();
  const { periodo, hoje, mudarPeriodo } = usePeriodoRelatorio(caminhos.relatoriosExportacao);
  const [blocos, setBlocos] = useState<BlocoExportacao[]>(blocosExportacao);
  const [formato, setFormato] = useState<FormatoExportacao>('CSV');
  const [padrao, setPadrao] = useState<PadraoNumerico>('BRASILEIRO');

  const resumo = useDadosAssincronos((signal) => servicoRelatorios.buscarResumo(periodo, signal), [periodo]);
  const sessaoEncerrada = ehErroApi(resumo.erro, 'NAO_AUTORIZADO');

  useEffect(() => {
    if (sessaoEncerrada) marcarDesconectada();
  }, [sessaoEncerrada, marcarDesconectada]);

  return (
    <>
      <CabecalhoPagina
        titulo={TITULO}
        descricao={`O resumo ${periodoNaFrase(periodo)}, como arquivo ou como tabela.`}
      />

      <div className={estilos.blocos}>
        <BarraPeriodo periodo={periodo} hoje={hoje} aoMudar={mudarPeriodo} />

        {conexao.simulada ? (
          <Nota tom="aviso" icone={FlaskConical} titulo="Dados demonstrativos.">
            Os arquivos saem com números fictícios, que não vêm do seu banco. Cada um leva esse aviso no nome e no
            conteúdo.
          </Nota>
        ) : null}

        <div className={estilos.conteudo} aria-busy={resumo.carregando}>
          <ConteudoAssincrono
            resultado={resumo}
            esqueleto={<EsqueletoExportacao />}
            tituloErro="Não foi possível carregar o resumo para exportar"
          >
            {(dados) => (
              <CorpoExportacao
                dados={dados}
                conexao={conexao}
                atualizando={resumo.carregando}
                blocos={blocos}
                formato={formato}
                padrao={padrao}
                aoMudarBlocos={setBlocos}
                aoMudarFormato={setFormato}
                aoMudarPadrao={setPadrao}
              />
            )}
          </ConteudoAssincrono>
        </div>
      </div>
    </>
  );
}

interface CorpoExportacaoProps {
  dados: ResumoRelatorioDTO;
  conexao: ConexaoDTO;
  atualizando: boolean;
  blocos: BlocoExportacao[];
  formato: FormatoExportacao;
  padrao: PadraoNumerico;
  aoMudarBlocos: (blocos: BlocoExportacao[]) => void;
  aoMudarFormato: (formato: FormatoExportacao) => void;
  aoMudarPadrao: (padrao: PadraoNumerico) => void;
}

function CorpoExportacao({
  dados,
  conexao,
  atualizando,
  blocos,
  formato,
  padrao,
  aoMudarBlocos,
  aoMudarFormato,
  aoMudarPadrao,
}: CorpoExportacaoProps) {
  const notificacoes = useNotificacoes();
  const [nomeAberto, setNomeAberto] = useState<string | null>(null);

  const arquivos = useMemo(
    () =>
      gerarArquivos(dados, {
        blocos,
        formato,
        padrao,
        nomeConexao: conexao.nome,
        simulada: conexao.simulada,
        geradoEm: new Date().toISOString(),
      }),
    [dados, blocos, formato, padrao, conexao.nome, conexao.simulada],
  );

  const linhasPorBloco = useMemo(
    () =>
      Object.fromEntries(blocosExportacao.map((bloco) => [bloco, contarLinhas(dados, bloco)])) as Record<
        BlocoExportacao,
        number
      >,
    [dados],
  );

  if (dados.indicadores.totalConsultas <= 0) {
    return (
      <Painel className={juntarClasses(estilos.regiao, atualizando && estilos.atualizando)}>
        <EstadoVazio
          icone={FileX2}
          titulo="Nada para exportar neste período"
          descricao="O banco não registrou consultas neste intervalo. Escolha outro período para gerar o arquivo."
        />
      </Painel>
    );
  }

  const baixar = () => {
    void baixarArquivos(arquivos);
    const [primeiro] = arquivos;
    if (arquivos.length === 1 && primeiro) {
      notificacoes.sucesso('Arquivo gerado', `${primeiro.nome} foi para os downloads do navegador.`);
      return;
    }
    notificacoes.sucesso(
      `${arquivos.length} arquivos gerados`,
      'Eles foram para os downloads do navegador. Se só o primeiro chegar, permita vários downloads para este site.',
    );
  };

  return (
    <div className={juntarClasses(estilos.colunas, estilos.regiao, atualizando && estilos.atualizando)}>
      <OpcoesExportacao
        blocos={blocos}
        formato={formato}
        padrao={padrao}
        linhasPorBloco={linhasPorBloco}
        quantidadeArquivos={arquivos.length}
        aoMudarBlocos={aoMudarBlocos}
        aoMudarFormato={aoMudarFormato}
        aoMudarPadrao={aoMudarPadrao}
        aoBaixar={baixar}
        textoParaColar={(bloco) => gerarTextoParaColar(dados, bloco, padrao, conexao.simulada)}
      />
      <PreviaExportacao arquivos={arquivos} nomeAberto={nomeAberto} aoAbrir={setNomeAberto} />
    </div>
  );
}

function EsqueletoExportacao() {
  return (
    <div className={estilos.colunas} role="status" aria-label="Carregando o resumo para exportar…">
      <Esqueleto altura={520} raio="var(--raio-lg)" />
      <Esqueleto altura={520} raio="var(--raio-lg)" />
    </div>
  );
}
