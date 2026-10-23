import type { LucideIcon } from 'lucide-react';
import { Eye, KeyRound, LogIn, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { EsqueletoLinhaDoTempo, LinhaDoTempo } from '@/componentes/comum/LinhaDoTempo';
import type { TomDoMarco } from '@/componentes/comum/LinhaDoTempo';
import type { CategoriaAuditoria, EventoAuditoriaDTO, ResultadoAuditoria } from '@/modelos/administracao';
import { descreverEvento, responsavelDoEvento, rotuloModuloAuditoria } from '@/regras/auditoria';
import { SeloResultadoAuditoria } from './SeloResultadoAuditoria';
import estilos from './LinhaDoTempoAuditoria.module.css';

const iconeDaCategoria: Record<CategoriaAuditoria, LucideIcon> = {
  AUTENTICACAO: LogIn,
  NAVEGACAO: Eye,
  CONSULTA: Search,
  CRIACAO: Plus,
  ATUALIZACAO: Pencil,
  EXCLUSAO: Trash2,
  PERMISSOES: KeyRound,
};

const tomDoResultado: Record<ResultadoAuditoria, TomDoMarco> = {
  SUCESSO: 'neutro',
  FALHA: 'aviso',
  NEGADO: 'erro',
};

interface LinhaDoTempoAuditoriaProps {
  eventos: EventoAuditoriaDTO[];
  geradoEm: string;
  idAberto: string | null;
  aoAbrir: (evento: EventoAuditoriaDTO) => void;
}

export function LinhaDoTempoAuditoria({ eventos, geradoEm, idAberto, aoAbrir }: LinhaDoTempoAuditoriaProps) {
  return (
    <LinhaDoTempo
      itens={eventos}
      agora={new Date(geradoEm)}
      rotulo="Eventos registrados no Orynt, do mais recente ao mais antigo"
      atributo="evento"
      idAberto={idAberto}
      chave={(evento) => evento.id}
      instante={(evento) => evento.ocorridoEm}
      tom={(evento) => tomDoResultado[evento.resultado]}
      icone={(evento) => iconeDaCategoria[evento.categoria]}
      conteudo={(evento) => (
        <>
          <span className={estilos.evento}>{descreverEvento(evento)}</span>
          <span className={estilos.meta}>
            <span className={estilos.quem}>{responsavelDoEvento(evento)}</span>
            {evento.conta ? <span className={`codigo ${estilos.email}`}>{evento.conta.email}</span> : null}
            <span>{rotuloModuloAuditoria[evento.modulo]}</span>
          </span>
        </>
      )}
      complemento={(evento) => (evento.resultado === 'SUCESSO' ? null : <SeloResultadoAuditoria resultado={evento.resultado} />)}
      rotuloDaAcao="Ver os detalhes do evento"
      aoAbrir={aoAbrir}
    />
  );
}

export function EsqueletoLinhaDoTempoAuditoria({ linhas }: { linhas: number }) {
  return <EsqueletoLinhaDoTempo linhas={linhas} rotulo="Carregando os eventos…" />;
}
