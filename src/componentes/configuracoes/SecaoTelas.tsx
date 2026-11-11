import { useMemo } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { Botao, CabecalhoPainel, EstadoErro, Esqueleto, IndicadorGiratorio, Interruptor, Painel } from '@/componentes/ui';
import { navegacaoDaConta } from '@/configuracoes/navegacao';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { useTelas } from '@/provedores/ProvedorTelas';
import type { EstadoGravacaoTelas } from '@/provedores/ProvedorTelas';
import { podeAbrirTela } from '@/regras/permissoesConta';
import { gruposDeTelas, listarRotulosDasTelas } from '@/regras/telasOcultas';
import { caminhos } from '@/rotas/caminhos';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import type { SecaoConfiguracaoProps } from './SecaoAparencia';
import estilos from './SecaoConfiguracao.module.css';
import estilosTelas from './SecaoTelas.module.css';

const TEXTO_DA_GRAVACAO: Record<EstadoGravacaoTelas, string> = {
  PARADO: '',
  SALVANDO: 'Salvando',
  SALVO: 'Alterações salvas',
};

function EstadoDaGravacao({ estado }: { estado: EstadoGravacaoTelas }) {
  return (
    <span className={estilosTelas.gravacao} aria-hidden="true">
      {estado === 'SALVANDO' ? <IndicadorGiratorio tamanho={13} /> : <Check size={14} strokeWidth={2.5} />}
      {TEXTO_DA_GRAVACAO[estado]}
    </span>
  );
}

export function SecaoTelas({ id, idTitulo }: SecaoConfiguracaoProps) {
  const { usuario } = useAutenticacao();
  const { telasOcultas, carregado, erro, estadoGravacao, definirOculta, mostrarTodas, recarregar } = useTelas();
  const grupos = useMemo(() => gruposDeTelas(navegacaoDaConta(usuario)), [usuario]);
  const disponiveis = useMemo(() => new Set(grupos.flatMap((grupo) => grupo.telas.map((tela) => tela.codigo))), [grupos]);
  const ocultas = telasOcultas.filter((codigo) => disponiveis.has(codigo));
  const quantidade = ocultas.length;
  const fixas = podeAbrirTela(usuario, caminhos.dashboard) ? 'Dashboard e Configurações ficam' : 'Configurações fica';

  if (grupos.length === 0) return null;

  const aoMostrarTodas = () => {
    document.getElementById(idTitulo)?.focus({ preventScroll: true });
    mostrarTodas();
  };

  return (
    <Painel id={id} aria-labelledby={idTitulo} className={juntarClasses(estilos.secao, estilosTelas.secao)}>
      <CabecalhoPainel
        titulo={
          <span id={idTitulo} tabIndex={-1} className={estilos.ancora}>
            Telas
          </span>
        }
        descricao="Desligue uma tela para tirá-la do menu. Nada é apagado, e ela volta quando você a ligar de novo."
        acao={estadoGravacao === 'PARADO' ? undefined : <EstadoDaGravacao estado={estadoGravacao} />}
      />
      <span className="visualmente-oculto" aria-live="polite">
        {TEXTO_DA_GRAVACAO[estadoGravacao]}
      </span>

      {carregado && erro ? (
        <EstadoErro titulo="Não foi possível carregar as telas" erro={erro} aoTentarNovamente={recarregar} compacto />
      ) : (
        <div className={estilosTelas.grupos} aria-busy={!carregado}>
          {grupos.map((grupo) => (
            <section key={grupo.titulo} className={estilosTelas.grupo} aria-label={grupo.titulo}>
              <h3 className={estilosTelas.tituloGrupo}>{grupo.titulo}</h3>
              <ul className={estilosTelas.itens}>
                {grupo.telas.map((tela, indice) => (
                  <li key={tela.codigo} className={estilosTelas.item}>
                    {carregado ? (
                      <Interruptor ligado={!telasOcultas.includes(tela.codigo)} aoMudar={(ligado) => definirOculta(tela.codigo, !ligado)}>
                        {tela.rotulo}
                      </Interruptor>
                    ) : (
                      <span className={estilosTelas.esqueletoItem}>
                        <Esqueleto largura={32} altura={18} raio="var(--raio-pilula)" />
                        <Esqueleto largura={indice % 2 === 0 ? 96 : 72} altura={12} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className={estilosTelas.resumo}>
            <span className={estilosTelas.iconeResumo} aria-hidden="true">
              {quantidade > 0 ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
            </span>
            <div className={estilosTelas.textosResumo} aria-live="polite">
              {carregado ? (
                <>
                  <p className={estilosTelas.tituloResumo}>
                    {quantidade === 0 ? 'Todas as telas no menu' : quantidade === 1 ? '1 tela oculta' : `${quantidade} telas ocultas`}
                  </p>
                  <p className={estilosTelas.descricaoResumo}>
                    {quantidade === 0
                      ? `${fixas} sempre no menu.`
                      : `${listarRotulosDasTelas(ocultas)} ${quantidade === 1 ? 'está fora' : 'estão fora'} do menu. Nada foi apagado.`}
                  </p>
                </>
              ) : (
                <>
                  <Esqueleto largura={140} altura={14} />
                  <Esqueleto largura={240} altura={12} />
                  <span className="visualmente-oculto">Carregando as telas</span>
                </>
              )}
            </div>
            <Botao variante="secundario" tamanho="sm" icone={Eye} onClick={aoMostrarTodas} disabled={!carregado || quantidade === 0}>
              Mostrar todas
            </Botao>
          </div>
        </div>
      )}
    </Painel>
  );
}
