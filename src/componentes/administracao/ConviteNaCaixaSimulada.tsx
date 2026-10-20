import { useSyncExternalStore } from 'react';
import { ExternalLink, Inbox } from 'lucide-react';
import { Nota } from '@/componentes/ui';
import { assinarConvitesSimulados, lerConviteSimulado, versaoDosConvitesSimulados } from '@/dados/simulacao/convitesSimulados';
import { caminhos } from '@/rotas/caminhos';
import estilos from './ConviteNaCaixaSimulada.module.css';

export default function ConviteNaCaixaSimulada({ contaId }: { contaId: string }) {
  useSyncExternalStore(assinarConvitesSimulados, versaoDosConvitesSimulados);
  const convite = lerConviteSimulado(contaId);

  return (
    <Nota tom="aviso" icone={Inbox} titulo="Caixa de entrada simulada.">
      {convite ? (
        <span className={estilos.conteudo}>
          <span>
            O convite para <span className="codigo">{convite.destinatario}</span> chegou aqui, porque nenhum e-mail sai da
            demonstração. Ele abre numa aba nova, e a senha é definida lá sem sair desta conta.
          </span>
          <a
            className={estilos.link}
            href={`${caminhos.ativarConta}#convite=${encodeURIComponent(convite.token)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir o convite
            <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
            <span className="visualmente-oculto">(abre em outra aba)</span>
          </a>
        </span>
      ) : (
        'O link do convite fica só na memória desta aba e se perdeu ao recarregar. Reenvie o convite para ver um link novo aqui.'
      )}
    </Nota>
  );
}
