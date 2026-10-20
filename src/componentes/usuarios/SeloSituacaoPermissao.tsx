import type { LucideIcon } from 'lucide-react';
import {
  CircleDashed,
  Database,
  Eye,
  FilePlus2,
  FolderLock,
  FolderPlus,
  FolderTree,
  Hash,
  Layers,
  ListChecks,
  PenLine,
  Share2,
  ShieldAlert,
  SquareFunction,
  Table2,
} from 'lucide-react';
import { Selo } from '@/componentes/ui';
import type { TomSelo } from '@/componentes/ui';
import type { NivelDeAcesso, SituacaoPermissao, TipoObjetoPermissao } from '@/modelos/permissoes';
import { rotuloDoNivel, rotuloSituacaoPermissao, tomDaSituacaoPermissao } from '@/regras/permissoes';
import type { Acesso } from '@/regras/permissoes';

export const iconeDaSituacaoPermissao: Record<SituacaoPermissao, LucideIcon> = {
  DEFINIDOR_ABERTO: ShieldAlert,
  TODOS_CRIAM: FolderPlus,
  ESCRITA_NA_LEITURA: PenLine,
  REPASSE: Share2,
  SEM_USAGE: FolderLock,
  SEM_PRIVILEGIO_PADRAO: FilePlus2,
  USAGE_SEM_OBJETOS: CircleDashed,
};

export const iconeDoTipoObjetoPermissao: Record<TipoObjetoPermissao, LucideIcon> = {
  BANCO: Database,
  ESQUEMA: FolderTree,
  TABELA: Table2,
  VISAO: Eye,
  VISAO_MATERIALIZADA: Layers,
  SEQUENCIA: Hash,
  FUNCAO: SquareFunction,
  PROCEDIMENTO: ListChecks,
};

const tomDoNivel: Record<NivelDeAcesso, TomSelo> = {
  TOTAL: 'destaque',
  ESCRITA: 'neutro',
  LEITURA: 'neutro',
  MANUTENCAO: 'neutro',
  NENHUM: 'neutro',
};

export function SeloSituacaoPermissao({ situacao }: { situacao: SituacaoPermissao }) {
  return (
    <Selo tom={tomDaSituacaoPermissao[situacao]} icone={iconeDaSituacaoPermissao[situacao]}>
      {rotuloSituacaoPermissao[situacao]}
    </Selo>
  );
}

export function SeloNivel({ acesso }: { acesso: Pick<Acesso, 'nivel' | 'privilegios' | 'objeto'> }) {
  return <Selo tom={tomDoNivel[acesso.nivel]}>{rotuloDoNivel(acesso)}</Selo>;
}
