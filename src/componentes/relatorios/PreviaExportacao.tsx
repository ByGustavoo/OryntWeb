import { FileX2 } from 'lucide-react';
import { CabecalhoPainel, EstadoVazio, GrupoOpcoes, Painel } from '@/componentes/ui';
import { blocosExportacao, previaDoArquivo, rotuloBloco } from '@/regras/exportacaoRelatorio';
import type { ArquivoExportacao } from '@/regras/exportacaoRelatorio';
import { medirArquivo } from '@/utilitarios/download';
import { formatarNumero, formatarTamanho, pluralizar } from '@/utilitarios/formatacao';
import estilos from './PreviaExportacao.module.css';

interface PreviaExportacaoProps {
  arquivos: ArquivoExportacao[];
  nomeAberto: string | null;
  aoAbrir: (nome: string) => void;
}

const LINHAS_DA_PREVIA = 14;

function posicaoNaLista(arquivo: ArquivoExportacao): number {
  return arquivo.bloco ? blocosExportacao.indexOf(arquivo.bloco) : 0;
}

export function PreviaExportacao({ arquivos: arquivosGerados, nomeAberto, aoAbrir }: PreviaExportacaoProps) {
  const arquivos = [...arquivosGerados].sort((a, b) => posicaoNaLista(a) - posicaoNaLista(b));
  const aberto = arquivos.find((arquivo) => arquivo.nome === nomeAberto) ?? arquivos[0];

  if (!aberto) {
    return (
      <Painel aria-labelledby="titulo-previa-exportacao" className={estilos.painel}>
        <CabecalhoPainel titulo={<span id="titulo-previa-exportacao">Prévia</span>} descricao="As primeiras linhas do arquivo" />
        <EstadoVazio
          compacto
          icone={FileX2}
          titulo="Nenhum bloco marcado"
          descricao="Marque ao menos um bloco em Conteúdo para ver como o arquivo fica."
        />
      </Painel>
    );
  }

  const previa = previaDoArquivo(aberto.conteudo, LINHAS_DA_PREVIA);
  const totalDeLinhas = previa.linhas.length + previa.restantes;
  const opcoes = arquivos.map((arquivo) => ({
    valor: arquivo.nome,
    rotulo: arquivo.bloco ? rotuloBloco[arquivo.bloco] : arquivo.nome,
  }));

  return (
    <Painel aria-labelledby="titulo-previa-exportacao" className={estilos.painel}>
      <CabecalhoPainel
        titulo={<span id="titulo-previa-exportacao">Prévia</span>}
        descricao={arquivos.length > 1 ? 'As primeiras linhas de cada arquivo' : 'As primeiras linhas do arquivo'}
      />

      {arquivos.length > 1 ? (
        <GrupoOpcoes
          rotulo="Arquivo em prévia"
          opcoes={opcoes}
          valor={aberto.nome}
          aoMudar={aoAbrir}
          tamanho="sm"
          className={estilos.arquivos}
        />
      ) : null}

      <p className={estilos.identificacao}>
        <span className={`${estilos.nome} codigo`}>{aberto.nome}</span>
        <span className={estilos.medidas}>
          {formatarTamanho(medirArquivo(aberto.conteudo))} · {formatarNumero(totalDeLinhas)}{' '}
          {pluralizar(totalDeLinhas, 'linha', 'linhas')}
        </span>
      </p>

      <pre className={`${estilos.conteudo} codigo`} tabIndex={0} aria-label={`Início do arquivo ${aberto.nome}`}>
        {previa.linhas.join('\n')}
      </pre>

      {previa.restantes > 0 ? (
        <p className={estilos.restantes}>
          E mais {formatarNumero(previa.restantes)} {pluralizar(previa.restantes, 'linha', 'linhas')} no arquivo.
        </p>
      ) : null}
    </Painel>
  );
}
