import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Copy, UserRound } from 'lucide-react';
import { TrechoSql } from '@/componentes/comum/TrechoSql';
import { SeloDesempenho } from '@/componentes/dashboard/SeloDesempenho';
import { Botao } from '@/componentes/ui';
import type { ConsultaDetalhadaDTO } from '@/modelos/consultas';
import { useNotificacoes } from '@/provedores/ProvedorNotificacoes';
import { copiarTexto } from '@/utilitarios/areaTransferencia';
import { formatarDuracaoMs, formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import estilos from './DetalheObjeto.module.css';

const DURACAO_CONFIRMACAO_MS = 2400;

interface ItemConsultaProps {
  consulta: ConsultaDetalhadaDTO;
  etapa?: ReactNode;
  children: ReactNode;
}

export function ItemConsulta({ consulta, etapa, children }: ItemConsultaProps) {
  return (
    <div className={estilos.consulta}>
      {etapa ? <p className={estilos.etapaConsulta}>{etapa}</p> : null}
      <TrechoSql sql={consulta.sql} className={estilos.sqlConsulta} />
      <div className={estilos.rodapeConsulta}>
        <p className={estilos.numerosConsulta}>
          <span className="numeros">{formatarNumero(consulta.quantidadeExecucoes)}</span>{' '}
          {pluralizar(consulta.quantidadeExecucoes, 'execução', 'execuções')} ·{' '}
          <span className="numeros">{formatarDuracaoMs(consulta.tempoMedioMs)}</span> em média
        </p>
        <SeloDesempenho desempenho={consulta.desempenho} />
        <div className={estilos.acoesConsulta}>{children}</div>
      </div>
    </div>
  );
}

export function DonoDoObjeto({ dono, aoAbrir }: { dono: string; aoAbrir: (dono: string) => void }) {
  return (
    <p className={estilos.dono}>
      <UserRound size={14} strokeWidth={2} aria-hidden="true" />
      <span>Dono</span>
      <button type="button" className={`${estilos.linkDono} codigo`} onClick={() => aoAbrir(dono)}>
        {dono}
        <span className="visualmente-oculto">. Abrir este papel em Papéis</span>
      </button>
    </p>
  );
}

export function Medida({ rotulo, valor, dica }: { rotulo: string; valor: string; dica?: string }) {
  return (
    <div className={estilos.medida}>
      <dt className={estilos.rotuloMedida}>{rotulo}</dt>
      <dd className={`${estilos.valorMedida} numeros`} title={dica}>
        {valor}
      </dd>
    </div>
  );
}

interface SecaoCopiavelProps {
  id: string;
  titulo: string;
  texto: string;
  copiado: string;
  anuncio: string;
  tituloDoErro: string;
  descricaoDoErro: string;
  children?: ReactNode;
}

export function SecaoCopiavel({
  id,
  titulo,
  texto,
  copiado,
  anuncio,
  tituloDoErro,
  descricaoDoErro,
  children,
}: SecaoCopiavelProps) {
  const notificacoes = useNotificacoes();
  const [copiou, setCopiou] = useState(false);

  useEffect(() => {
    if (!copiou) return;
    const temporizador = window.setTimeout(() => setCopiou(false), DURACAO_CONFIRMACAO_MS);
    return () => window.clearTimeout(temporizador);
  }, [copiou]);

  const copiar = async () => {
    if (await copiarTexto(texto)) {
      setCopiou(true);
      return;
    }
    notificacoes.erro(tituloDoErro, descricaoDoErro);
  };

  return (
    <section className={estilos.secao} aria-labelledby={id}>
      <div className={estilos.cabecalhoSecao}>
        <h3 className={estilos.tituloSecao} id={id}>
          {titulo}
        </h3>
        <Botao variante="secundario" tamanho="sm" icone={copiou ? Check : Copy} onClick={() => void copiar()}>
          {copiou ? copiado : 'Copiar'}
        </Botao>
        <span className="visualmente-oculto" role="status">
          {copiou ? anuncio : ''}
        </span>
      </div>
      <div className={estilos.sql}>
        <TrechoSql sql={texto} inteiro dica={false} />
      </div>
      {children}
    </section>
  );
}
