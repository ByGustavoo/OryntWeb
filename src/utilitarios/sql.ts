export interface TrechoSql {
  texto: string;
  palavraChave: boolean;
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

export function destacarSql(sql: string): TrechoSql[] {
  return sql
    .split(SEPARADOR)
    .map((texto, indice) => ({ texto, palavraChave: indice % 2 === 1 }))
    .filter((trecho) => trecho.texto !== '');
}
