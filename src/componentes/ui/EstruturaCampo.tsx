import { useId } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './Campo.module.css';

export interface PropriedadesMensagensCampo {
  rotulo?: string;
  dica?: string;
  erro?: string;
  sucesso?: string;
  obrigatorio?: boolean;
  className?: string;
}

interface IdsCampo {
  idControle: string;
  idDescricao: string | undefined;
}

interface EstruturaCampoProps extends PropriedadesMensagensCampo {
  id?: string;
  aviso?: string;
  children: (ids: IdsCampo) => ReactNode;
}

export function EstruturaCampo({ id, rotulo, dica, erro, aviso, sucesso, obrigatorio, className, children }: EstruturaCampoProps) {
  const idGerado = useId();
  const idControle = id ?? idGerado;
  const idMensagem = `${idControle}-mensagem`;
  const mensagem = erro ?? aviso ?? sucesso ?? dica;

  return (
    <div className={juntarClasses(estilos.campo, className)}>
      {rotulo ? (
        <label className={estilos.rotulo} htmlFor={idControle}>
          {rotulo}
          {obrigatorio ? (
            <span className={estilos.obrigatorio} aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {children({ idControle, idDescricao: mensagem ? idMensagem : undefined })}

      {erro ? (
        <p className={juntarClasses(estilos.mensagem, estilos.mensagemErro)} id={idMensagem}>
          <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
          {erro}
        </p>
      ) : aviso ? (
        <p className={juntarClasses(estilos.mensagem, estilos.mensagemAviso)} id={idMensagem}>
          <Info size={14} strokeWidth={2} aria-hidden="true" />
          {aviso}
        </p>
      ) : sucesso ? (
        <p className={juntarClasses(estilos.mensagem, estilos.mensagemSucesso)} id={idMensagem}>
          <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
          {sucesso}
        </p>
      ) : dica ? (
        <p className={estilos.mensagem} id={idMensagem}>
          {dica}
        </p>
      ) : null}
    </div>
  );
}
