import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleAlert, CircleCheck } from 'lucide-react';
import { Botao, CampoSenha, CampoTexto, Nota } from '@/componentes/ui';
import type { FalhaAcesso } from '@/regras/falhaAcesso';
import type { CampoAcesso, CamposAcesso, ErrosAcesso } from '@/regras/validacaoAcesso';
import { caminhos } from '@/rotas/caminhos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import { idCampoAcesso } from './identificadores';
import estilos from './FormularioAcesso.module.css';
import estilosLink from './LinkAcesso.module.css';

export type AvisoSenhaRedefinida = 'REAL' | 'DEMONSTRACAO';

interface FormularioAcessoProps {
  campos: CamposAcesso;
  erros: ErrosAcesso;
  enviando: boolean;
  falha: FalhaAcesso | null;
  senhaRedefinida: AvisoSenhaRedefinida | null;
  aoAlterar: (campo: CampoAcesso, valor: string) => void;
  aoSair: (campo: CampoAcesso, valor: string) => void;
  aoEntrar: () => void;
  aoPedirRecuperacao: () => void;
}

export function FormularioAcesso({
  campos,
  erros,
  enviando,
  falha,
  senhaRedefinida,
  aoAlterar,
  aoSair,
  aoEntrar,
  aoPedirRecuperacao,
}: FormularioAcessoProps) {
  const propriedadesDoCampo = (campo: CampoAcesso) => ({
    id: idCampoAcesso(campo),
    name: campo,
    value: campos[campo],
    erro: erros[campo],
    readOnly: enviando,
    'aria-required': true,
    onChange: (evento: { target: { value: string } }) => aoAlterar(campo, evento.target.value),
    onBlur: (evento: { target: { value: string } }) => aoSair(campo, evento.target.value),
  });

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!enviando) aoEntrar();
  };

  return (
    <form className={estilos.formulario} onSubmit={enviar} noValidate aria-busy={enviando}>
      {falha ? (
        <Nota tom="erro" icone={CircleAlert} titulo={`${falha.titulo}.`} role="alert" className={estilos.aviso}>
          {falha.descricao}
        </Nota>
      ) : null}

      <div role="status" className={estilos.regiaoRedefinicao}>
        {senhaRedefinida === 'REAL' && !falha ? (
          <Nota tom="sucesso" icone={CircleCheck} titulo="Senha alterada." className={estilos.aviso}>
            Entre com a nova senha. As outras sessões abertas desta conta foram encerradas.
          </Nota>
        ) : null}
        {senhaRedefinida === 'DEMONSTRACAO' && !falha ? (
          <Nota tom="sucesso" icone={CircleCheck} titulo="Recuperação concluída." className={estilos.aviso}>
            Nesta demonstração a senha nova é descartada: o acesso continua sendo o do cartão abaixo.
          </Nota>
        ) : null}
      </div>

      <div className={estilos.campos}>
        <CampoTexto
          {...propriedadesDoCampo('email')}
          type="email"
          rotulo="E-mail"
          placeholder="voce@empresa.com"
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
        />

        <div className={estilos.senha}>
          <CampoSenha {...propriedadesDoCampo('senha')} rotulo="Senha" preenchimentoAutomatico="current-password" />
          <Link
            className={juntarClasses(estilosLink.link, estilos.recuperar)}
            to={caminhos.recuperarSenha}
            onClick={aoPedirRecuperacao}
          >
            Esqueceu sua senha?
          </Link>
        </div>
      </div>

      <p className="visualmente-oculto" role="status">
        {enviando ? 'Verificando o seu acesso…' : ''}
      </p>

      <Botao type="submit" tamanho="lg" larguraTotal carregando={enviando} iconeDireita={ArrowRight} className={estilos.entrar}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </Botao>
    </form>
  );
}
