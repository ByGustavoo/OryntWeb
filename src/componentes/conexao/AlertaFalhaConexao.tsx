import { forwardRef } from 'react';
import { CircleAlert, RotateCw } from 'lucide-react';
import { Botao } from '@/componentes/ui';
import type { FalhaConexao } from '@/regras/falhaConexao';
import estilos from './AlertaFalhaConexao.module.css';

interface AlertaFalhaConexaoProps {
  falha: FalhaConexao;
  origem: 'CONECTAR' | 'TESTAR' | 'SALVAR';
  aoTentarNovamente: () => void;
}

export const AlertaFalhaConexao = forwardRef<HTMLDivElement, AlertaFalhaConexaoProps>(function AlertaFalhaConexao(
  { falha, origem, aoTentarNovamente },
  ref,
) {
  return (
    <div ref={ref} className={estilos.alerta} role="alert" tabIndex={-1}>
      <span className={estilos.icone} aria-hidden="true">
        <CircleAlert size={18} strokeWidth={2} />
      </span>
      <div className={estilos.textos}>
        <p className={estilos.titulo}>
          <span className="visualmente-oculto">{origem === 'TESTAR' ? 'O teste falhou: ' : origem === 'SALVAR' ? 'A conexão não foi salva: ' : 'A conexão falhou: '}</span>
          {falha.titulo}
        </p>
        <p className={estilos.descricao}>
          {falha.descricao} {falha.orientacao}
        </p>
      </div>
      <Botao variante="secundario" tamanho="sm" icone={RotateCw} className={estilos.acao} onClick={aoTentarNovamente}>
        Tentar novamente
      </Botao>
    </div>
  );
});
