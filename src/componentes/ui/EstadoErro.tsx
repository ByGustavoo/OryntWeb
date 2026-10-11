import { CloudOff, RotateCw } from 'lucide-react';
import { descreverFalha } from '@/api/tratamentoErros';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { Botao } from './Botao';
import estilos from './EstadoMensagem.module.css';

const DESCRICAO_PADRAO = 'Verifique sua conexão e tente novamente. Se o problema continuar, tente mais tarde.';

export interface EstadoErroProps {
  titulo: string;
  descricao?: string;
  erro?: unknown;
  aoTentarNovamente?: () => void;
  tentando?: boolean;
  compacto?: boolean;
  className?: string;
}

export function EstadoErro({
  titulo,
  descricao: descricaoInformada,
  erro,
  aoTentarNovamente,
  tentando = false,
  compacto = false,
  className,
}: EstadoErroProps) {
  const descricao = descricaoInformada ?? (erro === undefined ? DESCRICAO_PADRAO : descreverFalha(erro));
  return (
    <div className={juntarClasses(estilos.estado, estilos.erro, compacto && estilos.compacto, className)} role="alert">
      <span className={estilos.icone} aria-hidden="true">
        <CloudOff size={compacto ? 18 : 22} strokeWidth={1.75} />
      </span>
      <div className={estilos.textos}>
        <p className={estilos.titulo}>{titulo}</p>
        <p className={estilos.descricao}>{descricao}</p>
      </div>
      {aoTentarNovamente ? (
        <div className={estilos.acoes}>
          <Botao variante="secundario" tamanho="sm" icone={RotateCw} onClick={aoTentarNovamente} carregando={tentando}>
            Tentar novamente
          </Botao>
        </div>
      ) : null}
    </div>
  );
}
