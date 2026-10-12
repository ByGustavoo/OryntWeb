import { useEffect, useId, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { Botao, BotaoIcone, CabecalhoPainel, GrupoOpcoes, Painel } from '@/componentes/ui';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { blocosExportacao, formatosExportacao, padroesNumericos, rotuloBloco } from '@/regras/exportacaoRelatorio';
import type { BlocoExportacao, FormatoExportacao, PadraoNumerico } from '@/regras/exportacaoRelatorio';
import { copiarTexto } from '@/utilitarios/areaTransferencia';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './OpcoesExportacao.module.css';

interface OpcoesExportacaoProps {
  blocos: BlocoExportacao[];
  formato: FormatoExportacao;
  padrao: PadraoNumerico;
  linhasPorBloco: Record<BlocoExportacao, number>;
  quantidadeArquivos: number;
  aoMudarBlocos: (blocos: BlocoExportacao[]) => void;
  aoMudarFormato: (formato: FormatoExportacao) => void;
  aoMudarPadrao: (padrao: PadraoNumerico) => void;
  aoBaixar: () => void;
  textoParaColar: (bloco: BlocoExportacao) => string;
}

const DURACAO_CONFIRMACAO_MS = 2400;

const descricaoBloco: Record<BlocoExportacao, string> = {
  EVOLUCAO: 'Volume e tempo médio em cada dia ou hora',
  CONSULTAS: 'As que mais pesaram, com o tempo médio e a variação',
  DESEMPENHO: 'Execuções e tempo do banco por faixa',
  INDICADORES: 'Totais do período e a variação contra o anterior',
};

const rotuloFormato: Record<FormatoExportacao, string> = {
  CSV: 'CSV',
  JSON: 'JSON',
  MARKDOWN: 'Markdown',
};

const descricaoFormato: Record<FormatoExportacao, string> = {
  CSV: 'Um arquivo por bloco, para abrir em planilha.',
  JSON: 'Um arquivo com os campos do relatório, para outros sistemas.',
  MARKDOWN: 'Um documento com tabelas, para wiki, chamado ou pull request.',
};

const opcoesPadrao = padroesNumericos.map((padrao) => ({
  valor: padrao,
  rotulo: padrao === 'BRASILEIRO' ? 'Brasil' : 'Internacional',
}));

const descricaoPadrao: Record<PadraoNumerico, string> = {
  BRASILEIRO: 'Ponto e vírgula entre as colunas e vírgula decimal, como o Excel em português espera.',
  INTERNACIONAL: 'Vírgula entre as colunas e ponto decimal.',
};

export function OpcoesExportacao({
  blocos,
  formato,
  padrao,
  linhasPorBloco,
  quantidadeArquivos,
  aoMudarBlocos,
  aoMudarFormato,
  aoMudarPadrao,
  aoBaixar,
  textoParaColar,
}: OpcoesExportacaoProps) {
  const notificacoes = useNotificacoes();
  const nomeFormato = useId();
  const idAjudaBaixar = useId();
  const [copiado, setCopiado] = useState<BlocoExportacao | null>(null);
  const semBlocos = blocos.length === 0;

  useEffect(() => {
    if (!copiado) return;
    const temporizador = window.setTimeout(() => setCopiado(null), DURACAO_CONFIRMACAO_MS);
    return () => window.clearTimeout(temporizador);
  }, [copiado]);

  const alternarBloco = (bloco: BlocoExportacao) => {
    aoMudarBlocos(blocos.includes(bloco) ? blocos.filter((atual) => atual !== bloco) : [...blocos, bloco]);
  };

  const copiar = async (bloco: BlocoExportacao) => {
    if (await copiarTexto(textoParaColar(bloco))) {
      setCopiado(bloco);
      return;
    }
    notificacoes.erro(
      'Não foi possível copiar a tabela',
      'O navegador bloqueou a área de transferência. Baixe o arquivo CSV e abra na planilha.',
    );
  };

  return (
    <Painel aria-labelledby="titulo-opcoes-exportacao" className={estilos.painel}>
      <CabecalhoPainel
        titulo={<span id="titulo-opcoes-exportacao">O que exportar</span>}
        descricao="Escolha os blocos do resumo e o formato do arquivo"
      />

      <fieldset className={estilos.grupo}>
        <legend className={estilos.legenda}>Conteúdo</legend>
        <ul className={estilos.blocos}>
          {blocosExportacao.map((bloco) => {
            const linhas = linhasPorBloco[bloco];
            const foiCopiado = copiado === bloco;
            return (
              <li className={estilos.bloco} key={bloco}>
                <label className={estilos.marcacao}>
                  <input
                    type="checkbox"
                    className={estilos.caixa}
                    checked={blocos.includes(bloco)}
                    onChange={() => alternarBloco(bloco)}
                  />
                  <span className={estilos.textos}>
                    <span className={estilos.rotulo}>{rotuloBloco[bloco]}</span>
                    <span className={estilos.descricao}>{descricaoBloco[bloco]}</span>
                  </span>
                  <span className={`${estilos.linhas} numeros`}>
                    {formatarNumero(linhas)} {pluralizar(linhas, 'linha', 'linhas')}
                  </span>
                </label>
                <BotaoIcone
                  icone={foiCopiado ? Check : Copy}
                  rotulo={foiCopiado ? `${rotuloBloco[bloco]}: tabela copiada` : `Copiar ${rotuloBloco[bloco]} como tabela`}
                  tamanho="sm"
                  onClick={() => void copiar(bloco)}
                />
              </li>
            );
          })}
        </ul>
        <span className="visualmente-oculto" role="status">
          {copiado ? `${rotuloBloco[copiado]}: tabela copiada para a área de transferência.` : ''}
        </span>
      </fieldset>

      <fieldset className={estilos.grupo}>
        <legend className={estilos.legenda}>Formato</legend>
        <div className={estilos.formatos}>
          {formatosExportacao.map((opcao) => {
            const selecionado = formato === opcao;
            return (
              <label key={opcao} className={juntarClasses(estilos.formato, selecionado && estilos.selecionado)}>
                <input
                  type="radio"
                  name={nomeFormato}
                  value={opcao}
                  checked={selecionado}
                  onChange={() => aoMudarFormato(opcao)}
                  className={estilos.entrada}
                />
                <span className={estilos.marcador} aria-hidden="true" />
                <span className={estilos.textos}>
                  <span className={estilos.rotulo}>{rotuloFormato[opcao]}</span>
                  <span className={estilos.descricao}>{descricaoFormato[opcao]}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className={estilos.grupo}>
        <p className={estilos.legenda}>Números</p>
        <div className={estilos.padrao}>
          <GrupoOpcoes rotulo="Padrão dos números" opcoes={opcoesPadrao} valor={padrao} aoMudar={aoMudarPadrao} tamanho="sm" />
          <p className={estilos.descricao}>
            {descricaoPadrao[padrao]}{' '}
            {formato === 'CSV' ? 'Vale para o CSV e para a tabela copiada.' : 'Vale só para a tabela copiada neste formato.'}
          </p>
        </div>
      </div>

      <div className={estilos.rodape}>
        <p className={estilos.resumo} id={idAjudaBaixar}>
          {semBlocos
            ? 'Marque ao menos um bloco para gerar o arquivo.'
            : `${formatarNumero(quantidadeArquivos)} ${pluralizar(quantidadeArquivos, 'arquivo', 'arquivos')} ${rotuloFormato[formato]}`}
        </p>
        <Botao icone={Download} onClick={aoBaixar} disabled={semBlocos} aria-describedby={idAjudaBaixar}>
          {quantidadeArquivos > 1 ? `Baixar ${formatarNumero(quantidadeArquivos)} arquivos` : 'Baixar arquivo'}
        </Botao>
      </div>
    </Painel>
  );
}
