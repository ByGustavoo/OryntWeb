import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, CircleAlert, Clock } from 'lucide-react';
import { Botao, CampoSenha, CampoTexto, Nota } from '@/componentes/ui';
import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import type { FalhaAcesso } from '@/regras/falhaAcesso';
import type { CampoAcesso, CamposAcesso, ErrosAcesso } from '@/regras/validacaoAcesso';
import { idCampoAcesso } from './identificadores';
import estilos from './FormularioAcesso.module.css';

interface FormularioAcessoProps {
  campos: CamposAcesso;
  erros: ErrosAcesso;
  enviando: boolean;
  falha: FalhaAcesso | null;
  aoAlterar: (campo: CampoAcesso, valor: string) => void;
  aoSair: (campo: CampoAcesso, valor: string) => void;
  aoEntrar: () => void;
}

export function FormularioAcesso({ campos, erros, enviando, falha, aoAlterar, aoSair, aoEntrar }: FormularioAcessoProps) {
  const [recuperacaoPedida, setRecuperacaoPedida] = useState(false);

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
          <button type="button" className={estilos.recuperar} onClick={() => setRecuperacaoPedida(true)}>
            Esqueceu sua senha?
          </button>
        </div>
      </div>

      <div role="status" className={estilos.regiaoRecuperacao}>
        {recuperacaoPedida ? (
          <Nota tom="info" icone={Clock} titulo="Recuperação de senha em breve." className={estilos.aviso}>
            Esta função estará disponível em uma próxima versão do {NOME_APLICACAO}.
          </Nota>
        ) : null}
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
