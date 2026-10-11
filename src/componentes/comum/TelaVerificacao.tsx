import { IndicadorGiratorio } from '@/componentes/ui';
import { MarcaOrynt } from './MarcaOrynt';
import estilos from './TelaVerificacao.module.css';

interface TelaVerificacaoProps {
  mensagem?: string;
}

export function TelaVerificacao({ mensagem = 'Verificando a conexão…' }: TelaVerificacaoProps) {
  return (
    <div className={estilos.tela} role="status" aria-label={mensagem.replace('…', '')}>
      <MarcaOrynt tamanho={44} />
      <p className={estilos.texto}>
        <IndicadorGiratorio tamanho={14} />
        {mensagem}
      </p>
    </div>
  );
}
