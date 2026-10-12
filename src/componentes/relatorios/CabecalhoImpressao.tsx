import { MarcaOrynt } from '@/componentes/comum/MarcaOrynt';
import { NomeOrynt } from '@/componentes/comum/NomeOrynt';
import type { ConexaoDTO } from '@/modelos/conexao';
import type { PeriodoRelatorio } from '@/modelos/relatorios';
import { enderecoConexao } from '@/regras/conexoesSalvas';
import { inicioDoPeriodo, nomeDoDia, rotuloDoPeriodo } from '@/regras/periodoRelatorio';
import { formatarDataHoraCompleta, iniciarComMaiuscula } from '@/utilitarios/formatacao';
import estilos from './CabecalhoImpressao.module.css';

interface CabecalhoImpressaoProps {
  documento: string;
  periodo: PeriodoRelatorio;
  base: PeriodoRelatorio;
  conexao: ConexaoDTO;
  geradoEm: Date;
}

export function CabecalhoImpressao({ documento, periodo, base, conexao, geradoEm }: CabecalhoImpressaoProps) {
  return (
    <header className={estilos.folha}>
      <div className={estilos.topo}>
        <div className={estilos.marca}>
          <MarcaOrynt tamanho={32} />
          <NomeOrynt className={estilos.nome} />
        </div>
        <p className={estilos.documento}>
          <span className={estilos.secao}>Relatórios</span>
          <span className={estilos.nomeDocumento}>{documento}</span>
        </p>
      </div>

      <div className={estilos.regua} />

      <div className={estilos.assunto}>
        <h1 className={estilos.titulo}>
          {iniciarComMaiuscula(rotuloDoPeriodo(periodo))}
          {periodo.granularidade === 'DIA' ? (
            <span className={estilos.dia}>, {nomeDoDia(inicioDoPeriodo(periodo))}</span>
          ) : null}
        </h1>
        <p className={estilos.complemento}>Comparado com {rotuloDoPeriodo(base)}</p>
      </div>

      <dl className={estilos.dados}>
        <div className={estilos.dado}>
          <dt>Conexão</dt>
          <dd>{conexao.nome}</dd>
        </div>
        <div className={estilos.dado}>
          <dt>Endereço</dt>
          <dd className="codigo">{enderecoConexao(conexao)}</dd>
        </div>
        <div className={estilos.dado}>
          <dt>Gerado em</dt>
          <dd>{formatarDataHoraCompleta(geradoEm)}</dd>
        </div>
      </dl>
    </header>
  );
}
