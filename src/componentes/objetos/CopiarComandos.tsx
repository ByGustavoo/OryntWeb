import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Botao } from '@/componentes/ui';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import type { LoteDeComandos } from '@/regras/indices';
import { copiarTexto } from '@/utilitarios/areaTransferencia';
import { formatarNumero, pluralizar } from '@/utilitarios/formatacao';

const DURACAO_CONFIRMACAO_MS = 2400;

const ERRO_PADRAO = 'O navegador bloqueou a área de transferência. Abra cada índice e copie o comando pelo detalhe.';

export function CopiarComandos({ lote, seFalhar = ERRO_PADRAO }: { lote: LoteDeComandos; seFalhar?: string }) {
  const notificacoes = useNotificacoes();
  const [copiados, setCopiados] = useState(false);
  const quantidade = lote.comandos.length;

  useEffect(() => {
    if (!copiados) return;
    const temporizador = window.setTimeout(() => setCopiados(false), DURACAO_CONFIRMACAO_MS);
    return () => window.clearTimeout(temporizador);
  }, [copiados]);

  const copiar = async () => {
    if (await copiarTexto(lote.comandos.join('\n'))) {
      setCopiados(true);
      return;
    }
    notificacoes.erro('Não foi possível copiar os comandos', seFalhar);
  };

  return (
    <>
      <Botao
        variante="secundario"
        tamanho="sm"
        icone={copiados ? Check : Copy}
        aria-label={copiados ? undefined : lote.descricao}
        onClick={() => void copiar()}
      >
        {copiados ? pluralizar(quantidade, 'Copiado', 'Copiados') : lote.rotulo}
      </Botao>
      <span className="visualmente-oculto" role="status">
        {copiados
          ? `${formatarNumero(quantidade)} ${pluralizar(quantidade, 'comando copiado', 'comandos copiados')} para a área de transferência.`
          : ''}
      </span>
    </>
  );
}
