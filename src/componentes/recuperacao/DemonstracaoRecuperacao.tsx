import { useSyncExternalStore } from 'react';
import { FlaskConical, Inbox } from 'lucide-react';
import estilosCartao from '@/componentes/login/AcessoDemonstracao.module.css';
import { Botao } from '@/componentes/ui';
import { CREDENCIAIS_DEMONSTRACAO } from '@/dados/simulacao/credenciaisDemonstracao';
import { assinarCaixaEntradaSimulada, lerCaixaEntradaSimulada } from '@/dados/simulacao/recuperacaoSimulada';
import { VALIDADE_CODIGO_MINUTOS, agruparCodigo } from '@/regras/recuperacaoSenha';
import type { EtapaRecuperacao } from '@/regras/recuperacaoSenha';
import estilos from './DemonstracaoRecuperacao.module.css';

interface DemonstracaoRecuperacaoProps {
  etapa: EtapaRecuperacao;
  desabilitado: boolean;
  aoPreencherEmail: (email: string) => void;
  aoUsarCodigo: (codigo: string) => void;
}

const ID_TITULO = 'titulo-demonstracao-recuperacao';

function CaixaEntradaSimulada({ desabilitado, aoUsarCodigo }: Pick<DemonstracaoRecuperacaoProps, 'desabilitado' | 'aoUsarCodigo'>) {
  const mensagem = useSyncExternalStore(assinarCaixaEntradaSimulada, lerCaixaEntradaSimulada);
  const codigo = mensagem?.codigo ?? null;
  const vencida = mensagem !== null && (mensagem.esgotada || mensagem.expiraEm <= Date.now());

  if (!mensagem || codigo === null) {
    return (
      <>
        <p className={estilos.vazia}>
          {mensagem ? (
            <>
              Nenhuma mensagem para <span className={estilos.destinatario}>{mensagem.destinatario}</span>.
            </>
          ) : (
            'Nenhuma mensagem.'
          )}
        </p>
        <p className={estilosCartao.nota}>
          Nesta demonstração só {CREDENCIAIS_DEMONSTRACAO.email} tem conta. Com a API, a tela continua igual para qualquer
          e-mail e não revela qual existe.
        </p>
      </>
    );
  }

  return (
    <>
      <dl className={estilosCartao.credenciais}>
        <div className={estilosCartao.credencial}>
          <dt>Para</dt>
          <dd className="codigo">{mensagem.destinatario}</dd>
        </div>
        <div className={estilosCartao.credencial}>
          <dt>Código</dt>
          <dd className={estilos.codigo} data-vencido={vencida || undefined}>
            <span className="codigo">{agruparCodigo(codigo)}</span>
            {vencida ? <span className={estilos.situacao}>{mensagem.esgotada ? 'esgotado' : 'expirado'}</span> : null}
          </dd>
        </div>
      </dl>

      <Botao
        variante="secundario"
        tamanho="sm"
        disabled={desabilitado || vencida}
        className={estilosCartao.preencher}
        onClick={() => aoUsarCodigo(codigo)}
      >
        Usar código
      </Botao>

      <p className={estilosCartao.nota}>
        {vencida
          ? 'Este código não vale mais. Peça um novo com "Reenviar código".'
          : `Mensagem fictícia: nenhum e-mail saiu deste navegador. O código vale por ${VALIDADE_CODIGO_MINUTOS} minutos.`}
      </p>
    </>
  );
}

export default function DemonstracaoRecuperacao({ etapa, desabilitado, aoPreencherEmail, aoUsarCodigo }: DemonstracaoRecuperacaoProps) {
  const naCaixaEntrada = etapa === 'CODIGO';
  const Icone = naCaixaEntrada ? Inbox : FlaskConical;

  return (
    <aside className={estilosCartao.acesso} aria-labelledby={ID_TITULO}>
      <p className={estilosCartao.titulo} id={ID_TITULO}>
        <Icone size={14} strokeWidth={2} aria-hidden="true" />
        {naCaixaEntrada ? 'Caixa de entrada simulada' : 'Recuperação de demonstração'}
      </p>

      {etapa === 'EMAIL' ? (
        <>
          <dl className={estilosCartao.credenciais}>
            <div className={estilosCartao.credencial}>
              <dt>E-mail</dt>
              <dd className="codigo">{CREDENCIAIS_DEMONSTRACAO.email}</dd>
            </div>
          </dl>

          <Botao
            variante="secundario"
            tamanho="sm"
            disabled={desabilitado}
            className={estilosCartao.preencher}
            onClick={() => aoPreencherEmail(CREDENCIAIS_DEMONSTRACAO.email)}
          >
            Preencher
          </Botao>

          <p className={estilosCartao.nota}>
            Nenhum e-mail é enviado nesta versão. Na etapa seguinte, o código aparece aqui na tela.
          </p>
        </>
      ) : null}

      {naCaixaEntrada ? <CaixaEntradaSimulada desabilitado={desabilitado} aoUsarCodigo={aoUsarCodigo} /> : null}

      {etapa === 'SENHA' ? (
        <p className={estilos.unica}>
          A senha nova é conferida e descartada: o acesso continua sendo {CREDENCIAIS_DEMONSTRACAO.email} com a senha{' '}
          {CREDENCIAIS_DEMONSTRACAO.senha}.
        </p>
      ) : null}
    </aside>
  );
}
