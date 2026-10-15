import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { TrechoSql } from '@/componentes/comum/TrechoSql';
import { SeloDesempenho } from '@/componentes/dashboard/SeloDesempenho';
import { Botao, BotaoIcone, Esqueleto, Painel, Selo } from '@/componentes/ui';
import type { ConsultaDetalhadaDTO, TipoComando } from '@/modelos/consultas';
import type { DesempenhoConsulta, PeriodoDashboard } from '@/modelos/dashboard';
import { rotuloTipoComando } from '@/modelos/rotulos';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { copiarTexto } from '@/utilitarios/areaTransferencia';
import { formatarNumero } from '@/utilitarios/formatacao';
import { SeletorConsulta } from './SeletorConsulta';
import estilos from './ConsultaEmAnalise.module.css';

export interface ConsultaExibida {
  id: string;
  sql: string;
  tipo: TipoComando;
  desempenho: DesempenhoConsulta | null;
}

interface ConsultaEmAnaliseProps {
  periodo: PeriodoDashboard;
  consulta: ConsultaExibida | null;
  semConsultas: boolean;
  posicao: number | null;
  total: number;
  idAnterior: string | null;
  idSeguinte: string | null;
  emEspera: boolean;
  imediato: boolean;
  aoEscolher: (consulta: ConsultaDetalhadaDTO) => void;
  aoIrPara: (id: string) => void;
  rotuloDaPosicao?: string;
  acao?: (consulta: ConsultaExibida) => ReactNode;
}

const DURACAO_CONFIRMACAO_MS = 2400;

export function ConsultaEmAnalise({
  periodo,
  consulta,
  semConsultas,
  posicao,
  total,
  idAnterior,
  idSeguinte,
  emEspera,
  imediato,
  aoEscolher,
  aoIrPara,
  rotuloDaPosicao = 'por peso',
  acao,
}: ConsultaEmAnaliseProps) {
  const anterior = emEspera ? null : idAnterior;
  const seguinte = emEspera ? null : idSeguinte;

  return (
    <Painel aria-labelledby="titulo-consulta-em-analise" className={estilos.painel}>
      <h2 className="visualmente-oculto" id="titulo-consulta-em-analise">
        Consulta em análise
      </h2>

      <div className={estilos.topo}>
        <SeletorConsulta periodo={periodo} idAtual={consulta?.id ?? null} aoEscolher={aoEscolher} className={estilos.seletor} />

        {semConsultas ? null : (
          <div className={estilos.passos} role="group" aria-label="Percorrer as consultas pela ordem de peso">
            <p className={estilos.posicao} role="status">
              {emEspera ? (
                <Esqueleto largura={132} altura={12} imediato={imediato} />
              ) : posicao !== null ? (
                <span>
                  Consulta <span className="numeros">{formatarNumero(posicao)}</span> de{' '}
                  <span className="numeros">{formatarNumero(total)}</span> {rotuloDaPosicao}
                </span>
              ) : null}
            </p>
            <BotaoIcone
              icone={ChevronUp}
              rotulo="Consulta anterior"
              variante="secundario"
              aria-disabled={anterior ? undefined : true}
              onClick={() => anterior && aoIrPara(anterior)}
            />
            <BotaoIcone
              icone={ChevronDown}
              rotulo="Próxima consulta"
              variante="secundario"
              aria-disabled={seguinte ? undefined : true}
              onClick={() => seguinte && aoIrPara(seguinte)}
            />
          </div>
        )}
      </div>

      {consulta ? (
        <CorpoDaConsulta key={consulta.id} consulta={consulta} acao={acao?.(consulta)} />
      ) : semConsultas ? null : (
        <div className={estilos.corpo} aria-hidden="true">
          <div className={estilos.identificacao}>
            <div className={estilos.selos}>
              <Esqueleto largura={64} altura={22} raio="var(--raio-sm)" imediato={imediato} />
              <Esqueleto largura={89} altura={22} raio="var(--raio-sm)" imediato={imediato} />
            </div>
            <div className={estilos.acoes}>
              {acao ? <Esqueleto largura={110} altura={32} raio="var(--raio-md)" imediato={imediato} /> : null}
              <Esqueleto largura={90} altura={32} raio="var(--raio-md)" imediato={imediato} />
            </div>
          </div>
          <div className={estilos.sql}>
            <span className={estilos.linhaEmEspera}>
              <Esqueleto largura="72%" altura={12} imediato={imediato} />
            </span>
            <span className={estilos.linhaEmEspera}>
              <Esqueleto largura="38%" altura={12} imediato={imediato} />
            </span>
          </div>
        </div>
      )}
    </Painel>
  );
}

function CorpoDaConsulta({ consulta, acao }: { consulta: ConsultaExibida; acao: ReactNode }) {
  const notificacoes = useNotificacoes();
  const [copiada, setCopiada] = useState(false);

  useEffect(() => {
    if (!copiada) return;
    const temporizador = window.setTimeout(() => setCopiada(false), DURACAO_CONFIRMACAO_MS);
    return () => window.clearTimeout(temporizador);
  }, [copiada]);

  const copiar = async () => {
    if (await copiarTexto(consulta.sql)) {
      setCopiada(true);
      return;
    }
    notificacoes.erro(
      'Não foi possível copiar a consulta',
      'O navegador bloqueou a área de transferência. Selecione o texto da consulta e copie por lá.',
    );
  };

  return (
    <div className={estilos.corpo}>
      <div className={estilos.identificacao}>
        <div className={estilos.selos}>
          <Selo>{consulta.tipo === 'OUTRO' ? 'Outro comando' : rotuloTipoComando[consulta.tipo]}</Selo>
          {consulta.desempenho ? <SeloDesempenho desempenho={consulta.desempenho} /> : null}
        </div>
        <div className={estilos.acoes}>
          {acao}
          <Botao variante="secundario" tamanho="sm" icone={copiada ? Check : Copy} onClick={() => void copiar()}>
            {copiada ? 'Copiada' : 'Copiar'}
          </Botao>
        </div>
        <span className="visualmente-oculto" role="status">
          {copiada ? 'Consulta copiada para a área de transferência.' : ''}
        </span>
      </div>
      <div className={estilos.sql}>
        <TrechoSql sql={consulta.sql} inteiro dica={false} />
      </div>
    </div>
  );
}
