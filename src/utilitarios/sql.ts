export interface TrechoSql {
  texto: string;
  palavraChave: boolean;
  marcado: boolean;
}

export interface IntervaloDeTexto {
  inicio: number;
  fim: number;
}

const PALAVRAS_CHAVE = [
  'SELECT',
  'FROM',
  'WHERE',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'JOIN',
  'ON',
  'GROUP BY',
  'ORDER BY',
  'LIMIT',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'AND',
  'OR',
  'AS',
  'DESC',
  'ASC',
  'ILIKE',
  'LIKE',
];

const SEPARADOR = new RegExp(`\\b(${PALAVRAS_CHAVE.map((palavra) => palavra.replace(' ', '\\s+')).join('|')})\\b`);

function cortarPelosIntervalos(inicio: number, fim: number, marcados: IntervaloDeTexto[]): (IntervaloDeTexto & { marcado: boolean })[] {
  const pedacos: (IntervaloDeTexto & { marcado: boolean })[] = [];
  let posicao = inicio;

  for (const intervalo of marcados) {
    if (intervalo.fim <= posicao || intervalo.inicio >= fim) continue;
    const comeco = Math.max(intervalo.inicio, posicao);
    const termino = Math.min(intervalo.fim, fim);
    if (comeco > posicao) pedacos.push({ inicio: posicao, fim: comeco, marcado: false });
    pedacos.push({ inicio: comeco, fim: termino, marcado: true });
    posicao = termino;
  }
  if (posicao < fim) pedacos.push({ inicio: posicao, fim, marcado: false });
  return pedacos;
}

export function destacarSql(sql: string, marcados: IntervaloDeTexto[] = []): TrechoSql[] {
  const trechos: TrechoSql[] = [];
  let inicio = 0;

  sql.split(SEPARADOR).forEach((texto, indice) => {
    const fim = inicio + texto.length;
    for (const pedaco of cortarPelosIntervalos(inicio, fim, marcados)) {
      trechos.push({ texto: sql.slice(pedaco.inicio, pedaco.fim), palavraChave: indice % 2 === 1, marcado: pedaco.marcado });
    }
    inicio = fim;
  });

  return trechos;
}
