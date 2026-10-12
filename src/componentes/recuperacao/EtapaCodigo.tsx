import type { FormEvent } from 'react';
import { ArrowRight, CircleAlert, MailCheck } from 'lucide-react';
import estilosLink from '@/componentes/login/LinkAcesso.module.css';
import { Botao, CampoCodigo, Nota } from '@/componentes/ui';
import { useSegundosRestantes } from '@/ganchos/useSegundosRestantes';
import type { FalhaRecuperacao } from '@/regras/falhaRecuperacao';
import { TAMANHO_CODIGO, VALIDADE_CODIGO_MINUTOS, formatarEspera } from '@/regras/recuperacaoSenha';
import { idCampoRecuperacao } from './identificadores';
import estilos from './FormularioRecuperacao.module.css';

interface EtapaCodigoProps {
  codigo: string;
  erro: string | undefined;
  verificando: boolean;
  reenviando: boolean;
  reenviado: boolean;
  reenvioLiberadoEm: number | null;
  falha: FalhaRecuperacao | null;
  aoAlterar: (valor: string) => void;
  aoVerificar: () => void;
  aoReenviar: () => void;
  aoTrocarEmail: () => void;
}

interface ReenvioCodigoProps {
  liberadoEm: number | null;
  reenviando: boolean;
  ocupado: boolean;
  aoReenviar: () => void;
}

function ReenvioCodigo({ liberadoEm, reenviando, ocupado, aoReenviar }: ReenvioCodigoProps) {
  const segundos = useSegundosRestantes(liberadoEm);

  if (segundos > 0) {
    return (
      <p className={estilos.espera}>
        Reenviar código em <span className="numeros">{formatarEspera(segundos)}</span>
      </p>
    );
  }

  return (
    <button
      type="button"
      className={estilosLink.link}
      aria-disabled={reenviando || ocupado || undefined}
      onClick={() => {
        if (!reenviando && !ocupado) aoReenviar();
      }}
    >
      {reenviando ? 'Reenviando…' : 'Reenviar código'}
    </button>
  );
}

export function EtapaCodigo({
  codigo,
  erro,
  verificando,
  reenviando,
  reenviado,
  reenvioLiberadoEm,
  falha,
  aoAlterar,
  aoVerificar,
  aoReenviar,
  aoTrocarEmail,
}: EtapaCodigoProps) {
  const ocupado = verificando || reenviando;

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!ocupado) aoVerificar();
  };

  return (
    <form className={estilos.formulario} onSubmit={enviar} noValidate aria-busy={ocupado}>
      {falha ? (
        <Nota tom="erro" icone={CircleAlert} titulo={`${falha.titulo}.`} role="alert" className={estilos.aviso}>
          {falha.descricao}
        </Nota>
      ) : null}

      <div role="status" className={estilos.regiaoAviso}>
        {reenviado && !falha ? (
          <Nota tom="info" icone={MailCheck} titulo="Novo pedido enviado." className={estilos.aviso}>
            Se o e-mail estiver cadastrado, um novo código chega em instantes e o anterior deixa de valer.
          </Nota>
        ) : null}
      </div>

      <div className={estilos.campos}>
        <CampoCodigo
          id={idCampoRecuperacao('codigo')}
          name="codigo"
          rotulo="Código de verificação"
          dica={`São ${TAMANHO_CODIGO} dígitos, válidos por ${VALIDADE_CODIGO_MINUTOS} minutos. Você pode colar o código inteiro.`}
          valor={codigo}
          tamanho={TAMANHO_CODIGO}
          erro={erro}
          readOnly={ocupado}
          aria-required
          aoMudar={aoAlterar}
        />
      </div>

      <p className="visualmente-oculto" role="status">
        {verificando ? 'Validando o código…' : reenviando ? 'Enviando um novo pedido…' : ''}
      </p>

      <Botao type="submit" tamanho="lg" larguraTotal carregando={verificando} iconeDireita={ArrowRight} className={estilos.enviar}>
        {verificando ? 'Validando…' : 'Validar código'}
      </Botao>

      <div className={estilos.apoio}>
        <ReenvioCodigo liberadoEm={reenvioLiberadoEm} reenviando={reenviando} ocupado={verificando} aoReenviar={aoReenviar} />
        <button type="button" className={estilosLink.link} onClick={aoTrocarEmail}>
          Usar outro e-mail
        </button>
      </div>
    </form>
  );
}
