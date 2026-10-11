import type { FormEvent, ReactNode, RefObject } from 'react';
import { CircleCheck, Database } from 'lucide-react';
import { CampoSenha, CampoTexto, Nota } from '@/componentes/ui';
import type { OperacaoConexao } from '@/ganchos/useFluxoConexao';
import type { TesteConexaoDTO } from '@/modelos/conexao';
import { rotuloTipoBanco } from '@/modelos/rotulos';
import type { FalhaConexao } from '@/regras/falhaConexao';
import type { CamposDaUrl } from '@/regras/urlConexao';
import type { CampoConexao, CamposConexao, ErrosConexao } from '@/regras/validacaoConexao';
import { formatarNumero } from '@/utilitarios/formatacao';
import { AlertaFalhaConexao } from './AlertaFalhaConexao';
import { CampoUrlConexao } from './CampoUrlConexao';
import { idCampoConexao } from './identificadores';
import estilos from './FormularioConexao.module.css';

interface FormularioConexaoProps {
  id: string;
  campos: CamposConexao;
  erros: ErrosConexao;
  operacaoEmAndamento: OperacaoConexao | null;
  falha: { falha: FalhaConexao; operacao: OperacaoConexao } | null;
  teste: TesteConexaoDTO | null;
  alertaRef: RefObject<HTMLDivElement>;
  testeRef: RefObject<HTMLDivElement>;
  aoAlterar: (campo: CampoConexao, valor: string) => void;
  aoSair: (campo: CampoConexao, valor: string) => void;
  aoPreencherPelaUrl: (campos: CamposDaUrl) => void;
  aoConectar: () => void;
  aoTestar: () => void;
  children?: ReactNode;
}

function descreverAndamento(operacao: OperacaoConexao | null, campos: CamposConexao): string {
  if (!operacao) return '';
  const alvo = `${campos.host.trim()}:${campos.porta.trim()}`;
  return operacao === 'TESTAR' ? `Testando a conexão com ${alvo}…` : `Conectando a ${alvo}…`;
}

export function FormularioConexao({
  id,
  campos,
  erros,
  operacaoEmAndamento,
  falha,
  teste,
  alertaRef,
  testeRef,
  aoAlterar,
  aoSair,
  aoPreencherPelaUrl,
  aoConectar,
  aoTestar,
  children,
}: FormularioConexaoProps) {
  const enviando = operacaoEmAndamento !== null;

  const propriedadesDoCampo = (campo: CampoConexao) => ({
    id: idCampoConexao(campo),
    name: campo,
    value: campos[campo],
    erro: erros[campo],
    readOnly: enviando,
    onChange: (evento: { target: { value: string } }) => aoAlterar(campo, evento.target.value),
    onBlur: (evento: { target: { value: string } }) => aoSair(campo, evento.target.value),
  });

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    if (!enviando) aoConectar();
  };

  return (
    <form id={id} className={estilos.formulario} onSubmit={enviar} noValidate aria-busy={enviando}>
      {falha ? (
        <AlertaFalhaConexao
          ref={alertaRef}
          falha={falha.falha}
          origem={falha.operacao}
          aoTentarNovamente={falha.operacao === 'TESTAR' ? aoTestar : aoConectar}
        />
      ) : null}

      <CampoUrlConexao desabilitado={enviando} aoPreencher={aoPreencherPelaUrl} />

      <div className={estilos.campos}>
        <div className={estilos.tipoBanco}>
          <span className={estilos.rotuloTipo} id="rotulo-tipo-banco">
            Tipo de banco
          </span>
          <p className={estilos.valorTipo} aria-labelledby="rotulo-tipo-banco">
            <Database size={16} strokeWidth={2} aria-hidden="true" className={estilos.iconeTipo} />
            <span className={estilos.nomeTipo}>{rotuloTipoBanco.POSTGRESQL}</span>
            <span className={estilos.notaTipo}>Único disponível nesta versão</span>
          </p>
        </div>

        <CampoTexto
          {...propriedadesDoCampo('nome')}
          rotulo="Nome da conexão (opcional)"
          dica={erros.nome ? undefined : 'Um apelido para reconhecer esta conexão no cabeçalho.'}
          placeholder="Loja — produção"
          autoComplete="off"
        />

        <div className={estilos.linhaServidor}>
          <CampoTexto
            {...propriedadesDoCampo('host')}
            rotulo="Host"
            dica={erros.host ? undefined : 'Endereço do servidor: um domínio ou um IP.'}
            placeholder="db.empresa.com"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
            aria-required="true"
          />
          <CampoTexto
            {...propriedadesDoCampo('porta')}
            rotulo="Porta"
            autoComplete="off"
            inputMode="numeric"
            maxLength={5}
            aria-required="true"
          />
        </div>

        <CampoTexto
          {...propriedadesDoCampo('banco')}
          rotulo="Banco de dados"
          placeholder="loja"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-required="true"
        />

        <div className={estilos.linhaAcesso}>
          <CampoTexto
            {...propriedadesDoCampo('usuario')}
            rotulo="Usuário"
            placeholder="postgres"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-required="true"
          />
          <CampoSenha
            {...propriedadesDoCampo('senha')}
            rotulo="Senha"
            dica={erros.senha ? undefined : 'Não fica salva no navegador.'}
            aria-required="true"
          />
        </div>
      </div>

      {teste ? (
        <Nota
          ref={testeRef}
          tom="sucesso"
          icone={CircleCheck}
          titulo={teste.simulado ? 'Teste simulado concluído.' : 'Teste concluído.'}
          role="status"
        >
          {teste.versaoServidor} respondeu em {formatarNumero(teste.latenciaMs)} ms.
          {teste.simulado ? ' Nenhum banco real foi acessado.' : ''}
        </Nota>
      ) : null}

      <p className="visualmente-oculto" role="status">
        {descreverAndamento(operacaoEmAndamento, campos)}
      </p>

      {children}
    </form>
  );
}
