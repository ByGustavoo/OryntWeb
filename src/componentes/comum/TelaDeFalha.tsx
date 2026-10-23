import { RotateCw } from 'lucide-react';
import { Botao } from '@/componentes/ui';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import { useTituloDocumento } from '@/ganchos/useTituloDocumento';
import type { FalhaDeTela } from '@/regras/falhaDeTela';
import { interpretarFalhaDeTela } from '@/regras/falhaDeTela';
import { recarregarPagina } from './LimiteDeErro';
import { ConteudoDaMarcaDeErro, MolduraDeErro, classeDaMarcaDeErro } from './MolduraDeErro';
import { TerminalPsql } from './TerminalPsql';
import type { LinhaDoTerminal } from './TerminalPsql';

const ESPERA_DO_ERRO_MS = 520;
const ESPERA_DA_SEGUNDA_LINHA_MS = 380;
const ESPERA_DA_DICA_MS = 420;

function linhasDaFalha(falha: FalhaDeTela): LinhaDoTerminal[] {
  const carregamento = falha.motivo === 'CARREGAMENTO';
  return [
    {
      tipo: 'COMANDO',
      prompt: 'orynt=>',
      trechos: [{ texto: '\\c', tipo: 'palavra' }, { texto: ' orynt' }],
    },
    {
      tipo: 'SAIDA',
      espera: ESPERA_DO_ERRO_MS,
      espacoAntes: true,
      trechos: [{ texto: carregamento ? 'ERRO:' : 'FATAL:', tipo: 'erro' }, { texto: `  ${falha.linhaDoErro}` }],
    },
    {
      tipo: 'SAIDA',
      espera: ESPERA_DA_SEGUNDA_LINHA_MS,
      trechos: carregamento
        ? [{ texto: 'DETALHE:', tipo: 'apagado' }, { texto: '  saiu uma versão nova ou a rede caiu por um instante.' }]
        : [
            { texto: `A conexão com o ${NOME_APLICACAO} foi perdida. Tentando reiniciar: ` },
            { texto: 'falhou', tipo: 'forte' },
            { texto: '.' },
          ],
    },
    {
      tipo: 'SAIDA',
      espera: ESPERA_DA_DICA_MS,
      espacoAntes: true,
      trechos: [{ texto: 'DICA:', tipo: 'aviso' }, { texto: '  recarregue a página para tentar de novo.' }],
    },
  ];
}

export function TelaDeFalha({ erro }: { erro: unknown }) {
  const falha = interpretarFalhaDeTela(erro, 'APLICACAO');
  useTituloDocumento(falha.tituloDaAba);
  const carregamento = falha.motivo === 'CARREGAMENTO';

  return (
    <MolduraDeErro
      alerta
      marca={
        <a href="/" className={classeDaMarcaDeErro} aria-label={`${NOME_APLICACAO}, ir para o início`}>
          <ConteudoDaMarcaDeErro />
        </a>
      }
      terminal={
        <TerminalPsql
          linhas={linhasDaFalha(falha)}
          codigo={carregamento ? 'ERRO' : 'FATAL'}
          tom="erro"
          prompt={carregamento ? 'orynt=>' : 'orynt!>'}
        />
      }
      sobretitulo={carregamento ? 'Falha de carregamento' : 'Erro inesperado'}
      titulo={falha.titulo}
      descricao={`${falha.descricao} Nada foi alterado no seu banco.`}
      acoes={
        <Botao icone={RotateCw} onClick={recarregarPagina}>
          Recarregar a página
        </Botao>
      }
    />
  );
}
