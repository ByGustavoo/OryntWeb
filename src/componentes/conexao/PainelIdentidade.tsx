import { MarcaOrynt } from '@/componentes/comum/MarcaOrynt';
import { NomeOrynt } from '@/componentes/comum/NomeOrynt';
import { DESCRICAO_APLICACAO, NOME_APLICACAO, SLOGAN_APLICACAO } from '@/configuracoes/aplicacao';
import estilos from './PainelIdentidade.module.css';

interface PainelIdentidadeProps {
  demonstracao: boolean;
}

const ALTURAS_DAS_BARRAS = [34, 28, 40, 31, 36, 30, 100];

export function PainelIdentidade({ demonstracao }: PainelIdentidadeProps) {
  return (
    <aside className={estilos.painel} aria-label={`Sobre o ${NOME_APLICACAO}`}>
      <div className={estilos.marca}>
        <MarcaOrynt tamanho={36} />
        <NomeOrynt className={estilos.nome} />
      </div>

      <div className={estilos.apresentacao}>
        <p className={estilos.slogan}>{SLOGAN_APLICACAO}</p>
        <p className={estilos.descricao}>{DESCRICAO_APLICACAO}</p>

        <div className={estilos.ilustracao} aria-hidden="true">
          <div className={estilos.metrica}>
            <div className={estilos.leitura}>
              <span className={estilos.rotulo}>Tempo médio</span>
              <span className={estilos.valor}>1,84 s</span>
            </div>
            <div className={estilos.barras}>
              {ALTURAS_DAS_BARRAS.map((altura, indice) => (
                <span key={indice} style={{ height: `${altura}%` }} />
              ))}
            </div>
          </div>

          <span className={estilos.rota} />

          <div className={estilos.resposta}>
            <span className={estilos.rotulo}>Origem</span>
            <div className={estilos.consulta}>
              <span>
                <b>SELECT</b> c.nome, count(p.id)
              </span>
              <span>
                <b>FROM</b> clientes c
              </span>
              <span>
                <b>JOIN</b> pedidos p <b>ON</b> p.cliente_id = c.id
              </span>
            </div>
            <span className={estilos.rotulo}>62% do tempo total do banco</span>
          </div>
        </div>
      </div>

      {demonstracao ? (
        <p className={estilos.rodape}>Versão de demonstração: as conexões e os dados desta fase são simulados.</p>
      ) : null}
    </aside>
  );
}
