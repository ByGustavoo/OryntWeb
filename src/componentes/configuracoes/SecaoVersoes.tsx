import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppWindow, RotateCw, Server } from 'lucide-react';
import { Botao, CabecalhoPainel, Esqueleto, Painel } from '@/componentes/ui';
import { ambiente } from '@/configuracoes/ambiente';
import { useDadosAssincronos } from '@/ganchos/useDadosAssincronos';
import { servicoSistema } from '@/servicos';
import { formatarDataOpcional, formatarVersao } from '@/utilitarios/formatacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import type { SecaoConfiguracaoProps } from './SecaoAparencia';
import estilos from './SecaoConfiguracao.module.css';
import estilosVersoes from './SecaoVersoes.module.css';

const SEM_DATA_LANCAMENTO = 'Data de lançamento não informada';

function descreverLancamento(instante: string | null, semData: string = SEM_DATA_LANCAMENTO): string {
  const data = formatarDataOpcional(instante);
  return data ? `Lançada em ${data}` : semData;
}

function DescricaoVersao({ versao, detalhe }: { versao: string; detalhe: string }) {
  const rotulo = formatarVersao(versao);
  return (
    <>
      <p className={juntarClasses(estilosVersoes.versao, rotulo !== versao && 'numeros', 'revelar')}>{rotulo}</p>
      <p className={juntarClasses(estilosVersoes.detalhe, 'revelar')}>{detalhe}</p>
    </>
  );
}

interface CartaoVersaoProps {
  icone: LucideIcon;
  nome: string;
  aoVivo?: boolean;
  children: ReactNode;
}

function CartaoVersao({ icone: Icone, nome, aoVivo = false, children }: CartaoVersaoProps) {
  return (
    <li className={estilosVersoes.cartao}>
      <span className={estilosVersoes.icone} aria-hidden="true">
        <Icone size={18} strokeWidth={1.75} />
      </span>
      <div className={estilosVersoes.textos}>
        <h3 className={estilosVersoes.nome}>{nome}</h3>
        <div className={estilosVersoes.estado} aria-live={aoVivo ? 'polite' : undefined}>
          {children}
        </div>
      </div>
    </li>
  );
}

export function SecaoVersoes({ id, idTitulo }: SecaoConfiguracaoProps) {
  const versaoApi = useDadosAssincronos((signal) => servicoSistema.buscarVersao(signal), []);

  const tentarDeNovo = () => {
    document.getElementById(idTitulo)?.focus({ preventScroll: true });
    versaoApi.recarregar();
  };

  return (
    <Painel id={id} aria-labelledby={idTitulo} className={juntarClasses(estilos.secao, estilosVersoes.secao)}>
      <CabecalhoPainel
        titulo={
          <span id={idTitulo} tabIndex={-1} className={estilos.ancora}>
            Versões
          </span>
        }
        descricao="Qual versão do Orynt está rodando agora. Informe estes números ao relatar um problema."
      />

      <ul className={estilosVersoes.lista}>
        <CartaoVersao icone={AppWindow} nome="Orynt Web">
          {ambiente.versao ? (
            <DescricaoVersao
              versao={ambiente.versao}
              detalhe={descreverLancamento(
                ambiente.dataLancamento,
                ambiente.desenvolvimento ? 'Ambiente de desenvolvimento' : SEM_DATA_LANCAMENTO,
              )}
            />
          ) : (
            <p className={estilosVersoes.aviso}>Versão não informada</p>
          )}
        </CartaoVersao>

        <CartaoVersao icone={Server} nome="Orynt API" aoVivo>
          {versaoApi.dados ? (
            <DescricaoVersao
              versao={versaoApi.dados.versao}
              detalhe={descreverLancamento(versaoApi.dados.dataLancamento)}
            />
          ) : versaoApi.carregando ? (
            <>
              <span className={estilosVersoes.versao}>
                <Esqueleto largura={72} altura={16} />
              </span>
              <span className={estilosVersoes.detalhe}>
                <Esqueleto largura={176} altura={12} />
              </span>
              <span className="visualmente-oculto">Consultando a versão da API</span>
            </>
          ) : (
            <>
              <p className={estilosVersoes.aviso}>Não foi possível consultar</p>
              <Botao
                variante="terciario"
                tamanho="sm"
                icone={RotateCw}
                className={estilosVersoes.tentarDeNovo}
                onClick={tentarDeNovo}
              >
                Tentar de novo
              </Botao>
            </>
          )}
        </CartaoVersao>
      </ul>
    </Painel>
  );
}
