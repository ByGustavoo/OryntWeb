import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, FlaskConical, History, ListTree } from 'lucide-react';
import { TrechoSql } from '@/componentes/comum/TrechoSql';
import { SeloDesempenho } from '@/componentes/dashboard/SeloDesempenho';
import { Botao, BotaoIcone, Modal, Selo } from '@/componentes/ui';
import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import type { PeriodoDashboard } from '@/modelos/dashboard';
import { descricaoPeriodo, rotuloTipoComando } from '@/modelos/rotulos';
import type { SentidoDoPasso } from '@/regras/filtrosConsultas';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { copiarTexto } from '@/utilitarios/areaTransferencia';
import {
  formatarDecimal,
  formatarDuracaoExtensa,
  formatarDuracaoMs,
  formatarMedia,
  formatarNumero,
  formatarPercentual,
} from '@/utilitarios/formatacao';
import estilos from './DetalheConsulta.module.css';

const DURACAO_CONFIRMACAO_MS = 2400;
const MENOR_DISTANCIA_RELEVANTE = 1.05;

interface DetalheConsultaProps {
  consulta: ConsultaDetalhadaDTO | null;
  periodo: PeriodoDashboard;
  termos: string[];
  simulada: boolean;
  posicao: number | null;
  total: number;
  trocandoDePagina: boolean;
  aoPercorrer: (sentido: SentidoDoPasso) => void;
  aoVerHistorico: (consulta: ConsultaDetalhadaDTO) => void;
  aoVerPlano: (consulta: ConsultaDetalhadaDTO) => void;
  aoFechar: () => void;
  focoAoFechar: () => HTMLElement | null;
}

export function DetalheConsulta({
  consulta,
  periodo,
  termos,
  simulada,
  posicao,
  total,
  trocandoDePagina,
  aoPercorrer,
  aoVerHistorico,
  aoVerPlano,
  aoFechar,
  focoAoFechar,
}: DetalheConsultaProps) {
  const [exibida, setExibida] = useState(consulta);
  const [posicaoExibida, setPosicaoExibida] = useState(posicao);

  if (consulta && consulta !== exibida) setExibida(consulta);
  if (consulta && posicao !== null && posicao !== posicaoExibida) setPosicaoExibida(posicao);

  const temAnterior = !trocandoDePagina && posicao !== null && posicao > 1;
  const temSeguinte = !trocandoDePagina && posicao !== null && posicao < total;

  return (
    <Modal
      aberto={consulta !== null}
      aoFechar={aoFechar}
      titulo="Detalhes da consulta"
      descricao={`Como ela se comportou ${descricaoPeriodo[periodo]}.`}
      tamanho="lg"
      focoAoFechar={focoAoFechar}
      rodape={
        <div className={estilos.navegacao}>
          <div className={estilos.passos} role="group" aria-label="Percorrer as consultas da lista">
            <BotaoIcone
              icone={ChevronUp}
              rotulo="Consulta anterior"
              variante="secundario"
              aria-disabled={temAnterior ? undefined : true}
              onClick={() => temAnterior && aoPercorrer(-1)}
            />
            <BotaoIcone
              icone={ChevronDown}
              rotulo="Próxima consulta"
              variante="secundario"
              aria-disabled={temSeguinte ? undefined : true}
              onClick={() => temSeguinte && aoPercorrer(1)}
            />
          </div>
          <p className={estilos.posicao} role="status">
            {posicaoExibida !== null ? (
              <>
                <span className={estilos.palavraDaPosicao}>Consulta </span>
                <span className="numeros">{formatarNumero(posicaoExibida)}</span> de{' '}
                <span className="numeros">{formatarNumero(total)}</span>
              </>
            ) : null}
          </p>
          <div className={estilos.atalhos}>
            <Botao
              variante="secundario"
              icone={ListTree}
              title="Ver o plano de execução"
              onClick={() => exibida && aoVerPlano(exibida)}
            >
              <span className={estilos.rotuloAtalho}>Ver plano</span>
            </Botao>
            <Botao
              variante="secundario"
              icone={History}
              title="Ver o histórico"
              onClick={() => exibida && aoVerHistorico(exibida)}
            >
              <span className={estilos.rotuloAtalho}>Ver histórico</span>
            </Botao>
          </div>
        </div>
      }
    >
      {exibida ? <CorpoDetalhe key={exibida.id} consulta={exibida} termos={termos} simulada={simulada} /> : null}
    </Modal>
  );
}

function CorpoDetalhe({ consulta, termos, simulada }: { consulta: ConsultaDetalhadaDTO; termos: string[]; simulada: boolean }) {
  const notificacoes = useNotificacoes();
  const [copiada, setCopiada] = useState(false);
  const distanciaDoMaximo = consulta.tempoMedioMs > 0 ? consulta.tempoMaximoMs / consulta.tempoMedioMs : 0;

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
    <div className={estilos.detalhe}>
      <div className={estilos.selos}>
        <Selo>{consulta.tipo === 'OUTRO' ? 'Outro comando' : rotuloTipoComando[consulta.tipo]}</Selo>
        <SeloDesempenho desempenho={consulta.desempenho} />
        {simulada ? (
          <Selo tom="aviso" icone={FlaskConical}>
            Dados demonstrativos
          </Selo>
        ) : null}
      </div>

      <section className={estilos.secao} aria-labelledby="titulo-sql-detalhe">
        <div className={estilos.cabecalhoSecao}>
          <h3 className={estilos.tituloSecao} id="titulo-sql-detalhe">
            Consulta
          </h3>
          <Botao variante="secundario" tamanho="sm" icone={copiada ? Check : Copy} onClick={() => void copiar()}>
            {copiada ? 'Copiada' : 'Copiar'}
          </Botao>
          <span className="visualmente-oculto" role="status">
            {copiada ? 'Consulta copiada para a área de transferência.' : ''}
          </span>
        </div>
        <div className={estilos.sql}>
          <TrechoSql sql={consulta.sql} termos={termos} inteiro dica={false} />
        </div>
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-tempo-detalhe">
        <h3 className={estilos.tituloSecao} id="titulo-tempo-detalhe">
          Tempo por execução
        </h3>
        <dl className={estilos.medidas} data-grupo="tempo">
          <Medida rotulo="Mínimo" valor={formatarDuracaoMs(consulta.tempoMinimoMs)} />
          <Medida rotulo="Médio" valor={formatarDuracaoMs(consulta.tempoMedioMs)} />
          <Medida rotulo="Máximo" valor={formatarDuracaoMs(consulta.tempoMaximoMs)} />
        </dl>
        {distanciaDoMaximo >= MENOR_DISTANCIA_RELEVANTE ? (
          <p className={estilos.leitura}>
            A execução mais lenta levou {formatarDecimal(distanciaDoMaximo, 1)} vezes o tempo médio.
          </p>
        ) : null}
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-volume-detalhe">
        <h3 className={estilos.tituloSecao} id="titulo-volume-detalhe">
          No período
        </h3>
        <dl className={estilos.medidas} data-grupo="periodo">
          <Medida rotulo="Execuções" valor={formatarNumero(consulta.quantidadeExecucoes)} />
          <Medida rotulo="Tempo total" valor={formatarDuracaoExtensa(consulta.tempoTotalMs)} />
          <Medida rotulo="% do tempo total" valor={formatarPercentual(consulta.percentualTempoTotal)} />
          <Medida rotulo="Linhas por execução" valor={formatarMedia(consulta.linhasPorExecucao)} />
        </dl>
      </section>
    </div>
  );
}

function Medida({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className={estilos.medida}>
      <dt className={estilos.rotuloMedida}>{rotulo}</dt>
      <dd className={`${estilos.valorMedida} numeros`}>{valor}</dd>
    </div>
  );
}
