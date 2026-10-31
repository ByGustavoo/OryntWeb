import { DialogoConfirmacao } from '@/componentes/ui';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { usePermissao } from '@/ganchos/usePermissao';
import type { ConexaoSalvaDTO } from '@/modelos/conexao';
import { descreverImpactoDaExclusao } from '@/regras/backup';
import { servicoBackup } from '@/servicos';

interface DialogoExcluirConexaoProps {
  conexao: ConexaoSalvaDTO;
  aberto: boolean;
  emUso: boolean;
  excluindo: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

export function DialogoExcluirConexao({ conexao, aberto, emUso, excluindo, aoConfirmar, aoCancelar }: DialogoExcluirConexaoProps) {
  const veBackup = usePermissao('BACKUP_GERENCIAR');
  const impactos = useDadosAssincronos((signal) => (veBackup && aberto ? servicoBackup.listarImpactos(signal) : Promise.resolve([])), [veBackup, aberto]);
  const impacto = descreverImpactoDaExclusao(impactos.dados?.find((item) => item.conexaoId === conexao.id) ?? null);
  const base = emUso
    ? 'Esta conexão está em uso: o Orynt fica sem banco conectado até você escolher outra. Nada é alterado no banco de dados.'
    : 'A conexão sai da sua lista. Nada é alterado no banco de dados.';

  return (
    <DialogoConfirmacao
      aberto={aberto}
      titulo={`Excluir ${conexao.nome}?`}
      descricao={impacto ? `${base} ${impacto}` : base}
      textoConfirmar="Excluir"
      destrutivo
      carregando={excluindo || (aberto && impactos.carregando)}
      aoConfirmar={aoConfirmar}
      aoCancelar={aoCancelar}
    />
  );
}
