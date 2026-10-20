import type { CSSProperties } from 'react';
import { ShieldBan, X } from 'lucide-react';
import { Botao, CabecalhoPainel, Painel } from '@/componentes/ui';
import type { ContagemAuditoriaDTO, ResumoContaAuditoriaDTO } from '@/modelos/administracao';
import { rotuloCategoriaAuditoria, rotuloModuloAuditoria } from '@/regras/auditoria';
import { formatarInstante, formatarNumero, pluralizar } from '@/utilitarios/formatacao';
import estilos from './ResumoDaContaAuditoria.module.css';

interface ResumoDaContaAuditoriaProps {
  resumo: ResumoContaAuditoriaDTO;
  periodo: string;
  aoLimpar: () => void;
}

function Barras<T extends string>({ titulo, itens, rotulos }: { titulo: string; itens: ContagemAuditoriaDTO<T>[]; rotulos: Record<T, string> }) {
  const maior = Math.max(1, ...itens.map((item) => item.eventos));
  return (
    <div className={estilos.bloco}>
      <h3 className={estilos.tituloBloco}>{titulo}</h3>
      {itens.length === 0 ? (
        <p className={estilos.vazio}>Nada registrado.</p>
      ) : (
        <ul className={estilos.barras}>
          {itens.map((item) => (
            <li key={item.chave} className={estilos.barra}>
              <span className={estilos.rotulo}>{rotulos[item.chave]}</span>
              <span className={`${estilos.valor} numeros`}>{formatarNumero(item.eventos)}</span>
              <span className={estilos.trilho} aria-hidden="true">
                <span className={estilos.preenchimento} style={{ '--proporcao': item.eventos / maior } as CSSProperties} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ResumoDaContaAuditoria({ resumo, periodo, aoLimpar }: ResumoDaContaAuditoriaProps) {
  const total = resumo.porModulo.reduce((soma, item) => soma + item.eventos, 0);
  const intervalo =
    resumo.primeiroEventoEm && resumo.ultimoEventoEm
      ? `De ${formatarInstante(resumo.primeiroEventoEm)} a ${formatarInstante(resumo.ultimoEventoEm)}`
      : 'Nenhum evento';

  return (
    <Painel aria-label={`Atividade de ${resumo.conta.nome}`}>
      <CabecalhoPainel
        titulo={`Atividade de ${resumo.conta.nome}`}
        descricao={`${resumo.conta.email} · ${formatarNumero(total)} ${pluralizar(total, 'evento feito', 'eventos feitos')} pela própria conta ${periodo}. ${intervalo}.`}
        acao={
          <Botao variante="terciario" tamanho="sm" icone={X} onClick={aoLimpar}>
            Ver todas as contas
          </Botao>
        }
      />
      <div className={estilos.conteiner}>
        <div className={estilos.corpo}>
          <Barras titulo="Áreas acessadas" itens={resumo.porModulo} rotulos={rotuloModuloAuditoria} />
          <Barras titulo="O que fez" itens={resumo.porCategoria} rotulos={rotuloCategoriaAuditoria} />
        </div>
      </div>
      {resumo.negados > 0 ? (
        <p className={estilos.negados}>
          <ShieldBan size={16} strokeWidth={2} aria-hidden="true" />
          {formatarNumero(resumo.negados)} {pluralizar(resumo.negados, 'tentativa recusada', 'tentativas recusadas')} por falta de
          permissão.
        </p>
      ) : null}
    </Painel>
  );
}
