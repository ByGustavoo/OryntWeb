import type { FormEvent } from 'react';
import { ArrowRight, CircleAlert } from 'lucide-react';
import { Botao, CampoTexto, Nota } from '@/componentes/ui';
import type { FalhaRecuperacao } from '@/regras/falhaRecuperacao';
import { idCampoRecuperacao } from './identificadores';
import estilos from './FormularioRecuperacao.module.css';

interface EtapaEmailProps {
  email: string;
  erro: string | undefined;
  enviando: boolean;
  falha: FalhaRecuperacao | null;
  aoAlterar: (valor: string) => void;
  aoSair: (valor: string) => void;
  aoEnviar: () => void;
}

export function EtapaEmail({ email, erro, enviando, falha, aoAlterar, aoSair, aoEnviar }: EtapaEmailProps) {
  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!enviando) aoEnviar();
  };

  return (
    <form className={estilos.formulario} onSubmit={enviar} noValidate aria-busy={enviando}>
      {falha ? (
        <Nota tom="erro" icone={CircleAlert} titulo={`${falha.titulo}.`} role="alert" className={estilos.aviso}>
          {falha.descricao}
        </Nota>
      ) : null}

      <div className={estilos.campos}>
        <CampoTexto
          id={idCampoRecuperacao('email')}
          name="email"
          type="email"
          rotulo="E-mail"
          placeholder="voce@empresa.com"
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          value={email}
          erro={erro}
          readOnly={enviando}
          aria-required
          onChange={(evento) => aoAlterar(evento.target.value)}
          onBlur={(evento) => aoSair(evento.target.value)}
        />
      </div>

      <p className="visualmente-oculto" role="status">
        {enviando ? 'Enviando o pedido…' : ''}
      </p>

      <Botao type="submit" tamanho="lg" larguraTotal carregando={enviando} iconeDireita={ArrowRight} className={estilos.enviar}>
        {enviando ? 'Enviando…' : 'Enviar código'}
      </Botao>
    </form>
  );
}
