import { FlaskConical } from 'lucide-react';
import { Botao } from '@/componentes/ui';
import { CREDENCIAIS_DEMONSTRACAO } from '@/dados/simulacao/credenciaisDemonstracao';
import type { CamposAcesso } from '@/regras/validacaoAcesso';
import estilos from './AcessoDemonstracao.module.css';

interface AcessoDemonstracaoProps {
  desabilitado: boolean;
  aoPreencher: (campos: CamposAcesso) => void;
}

export default function AcessoDemonstracao({ desabilitado, aoPreencher }: AcessoDemonstracaoProps) {
  return (
    <aside className={estilos.acesso} aria-labelledby="titulo-acesso-demonstracao">
      <p className={estilos.titulo} id="titulo-acesso-demonstracao">
        <FlaskConical size={14} strokeWidth={2} aria-hidden="true" />
        Acesso de demonstração
      </p>

      <dl className={estilos.credenciais}>
        <div className={estilos.credencial}>
          <dt>E-mail</dt>
          <dd className="codigo">{CREDENCIAIS_DEMONSTRACAO.email}</dd>
        </div>
        <div className={estilos.credencial}>
          <dt>Senha</dt>
          <dd className="codigo">{CREDENCIAIS_DEMONSTRACAO.senha}</dd>
        </div>
      </dl>

      <Botao
        variante="secundario"
        tamanho="sm"
        disabled={desabilitado}
        className={estilos.preencher}
        onClick={() => aoPreencher({ ...CREDENCIAIS_DEMONSTRACAO })}
      >
        Preencher
      </Botao>

    </aside>
  );
}
