import type { ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
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

function DescricaoVersao({ versao, dataLancamento, semData }: { versao: string; dataLancamento: string | null; semData: string }) {
  const rotulo = formatarVersao(versao);
  const data = formatarDataOpcional(dataLancamento);
  return (
    <span className="revelar">
      <span className={juntarClasses(estilosVersoes.numero, rotulo !== versao && 'numeros')}>{rotulo}</span>
      <span className={estilosVersoes.separador} aria-hidden="true">
        {' —'}
      </span>{' '}
      {data ? (
        <span className={estilosVersoes.detalhe}>
          Lançada em <span className={estilosVersoes.data}>{data}</span>
        </span>
      ) : (
        <span className={estilosVersoes.detalhe}>{semData}</span>
      )}
    </span>
  );
}

function LinhaVersao({ nome, aoVivo = false, children }: { nome: string; aoVivo?: boolean; children: ReactNode }) {
  return (
    <div className={estilosVersoes.linha}>
      <dt>{nome}</dt>
      <dd className={estilosVersoes.valor} aria-live={aoVivo ? 'polite' : undefined}>
        {children}
      </dd>
    </div>
  );
}

export function SecaoVersoes({ id, idTitulo }: SecaoConfiguracaoProps) {
  const versaoApi = useDadosAssincronos((signal) => servicoSistema.buscarVersao(signal), []);

  const tentarDeNovo = () => {
    document.getElementById(idTitulo)?.focus({ preventScroll: true });
    versaoApi.recarregar();
  };

  return (
    <Painel id={id} aria-labelledby={idTitulo} className={estilos.secao}>
      <CabecalhoPainel
        titulo={
          <span id={idTitulo} tabIndex={-1} className={estilos.ancora}>
            Versões
          </span>
        }
      />

      <dl className={estilosVersoes.lista}>
        <LinhaVersao nome="API" aoVivo>
          {versaoApi.dados ? (
            <DescricaoVersao
              versao={versaoApi.dados.versao}
              dataLancamento={versaoApi.dados.dataLancamento}
              semData={SEM_DATA_LANCAMENTO}
            />
          ) : versaoApi.carregando ? (
            <>
              <Esqueleto largura={180} altura={14} />
              <span className="visualmente-oculto">Consultando a versão da API</span>
            </>
          ) : (
            <>
              <span className={estilosVersoes.detalhe}>Não foi possível consultar</span>
              <Botao variante="terciario" tamanho="sm" icone={RotateCw} className={estilosVersoes.tentarDeNovo} onClick={tentarDeNovo}>
                Tentar de novo
              </Botao>
            </>
          )}
        </LinhaVersao>

        <LinhaVersao nome="Web">
          {ambiente.versao ? (
            <DescricaoVersao
              versao={ambiente.versao}
              dataLancamento={ambiente.dataLancamento}
              semData={ambiente.desenvolvimento ? 'Ambiente de desenvolvimento' : SEM_DATA_LANCAMENTO}
            />
          ) : (
            <span className={estilosVersoes.detalhe}>Versão não informada</span>
          )}
        </LinhaVersao>
      </dl>
    </Painel>
  );
}
