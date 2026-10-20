import { useMemo } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, CircleAlert, ShieldCheck } from 'lucide-react';
import { Botao, CampoSenha, Nota } from '@/componentes/ui';
import type { FalhaRecuperacao } from '@/regras/falhaRecuperacao';
import { avaliarForcaSenha, termosDoEmail } from '@/regras/forcaSenha';
import { TAMANHO_MINIMO_SENHA } from '@/regras/recuperacaoSenha';
import type { CampoNovaSenha, CamposNovaSenha, ErrosRecuperacao } from '@/regras/recuperacaoSenha';
import { MedidorForcaSenha } from './MedidorForcaSenha';
import { idCampoRecuperacao } from './identificadores';
import estilos from './FormularioRecuperacao.module.css';

interface EtapaNovaSenhaProps {
  email: string;
  senhas: CamposNovaSenha;
  erros: ErrosRecuperacao;
  salvando: boolean;
  falha: FalhaRecuperacao | null;
  aoAlterar: (campo: CampoNovaSenha, valor: string) => void;
  aoSair: (campo: CampoNovaSenha) => void;
  aoSalvar: () => void;
  observacao?: string;
  textoDoBotao?: string;
}

const ORIENTACAO_INICIAL = `Use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres. Frases longas são melhores.`;

export function EtapaNovaSenha({
  email,
  senhas,
  erros,
  salvando,
  falha,
  aoAlterar,
  aoSair,
  aoSalvar,
  observacao = 'Ao salvar, as outras sessões abertas desta conta são encerradas.',
  textoDoBotao = 'Salvar nova senha',
}: EtapaNovaSenhaProps) {
  const termosPessoais = useMemo(() => termosDoEmail(email), [email]);
  const forca = avaliarForcaSenha(senhas.senha, termosPessoais);

  const propriedadesDoCampo = (campo: CampoNovaSenha) => ({
    id: idCampoRecuperacao(campo),
    name: campo,
    value: senhas[campo],
    erro: erros[campo],
    readOnly: salvando,
    preenchimentoAutomatico: 'new-password' as const,
    'aria-required': true,
    onChange: (evento: { target: { value: string } }) => aoAlterar(campo, evento.target.value),
    onBlur: () => aoSair(campo),
  });

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!salvando) aoSalvar();
  };

  return (
    <form className={estilos.formulario} onSubmit={enviar} noValidate aria-busy={salvando}>
      {falha ? (
        <Nota tom="erro" icone={CircleAlert} titulo={`${falha.titulo}.`} role="alert" className={estilos.aviso}>
          {falha.descricao}
        </Nota>
      ) : null}

      <input
        className="visualmente-oculto"
        type="email"
        name="email"
        autoComplete="username"
        value={email}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className={estilos.campos}>
        <CampoSenha
          {...propriedadesDoCampo('senha')}
          rotulo="Nova senha"
          dica={forca ? `${forca.rotulo}. ${forca.orientacao}` : ORIENTACAO_INICIAL}
          complemento={<MedidorForcaSenha forca={forca} />}
        />

        <CampoSenha {...propriedadesDoCampo('confirmacao')} rotulo="Confirme a nova senha" />
      </div>

      <Nota tom="neutro" icone={ShieldCheck} className={estilos.observacao}>
        {observacao}
      </Nota>

      <p className="visualmente-oculto" role="status">
        {salvando ? 'Salvando a nova senha…' : ''}
      </p>

      <Botao type="submit" tamanho="lg" larguraTotal carregando={salvando} iconeDireita={ArrowRight} className={estilos.enviar}>
        {salvando ? 'Salvando…' : textoDoBotao}
      </Botao>
    </form>
  );
}
