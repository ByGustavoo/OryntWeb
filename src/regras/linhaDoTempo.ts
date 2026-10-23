const formatadorDoDiaDoMes = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
const formatadorDoDiaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const formatadorComAno = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

export interface DiaDaLinhaDoTempo<T> {
  chave: string;
  nome: string;
  itens: T[];
}

export function chaveDoDia(instante: Date): string {
  return `${instante.getFullYear()}-${instante.getMonth() + 1}-${instante.getDate()}`;
}

export function nomeDoDia(instante: Date, agora: Date): string {
  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  const diaDoMes = formatadorDoDiaDoMes.format(instante);
  if (chaveDoDia(instante) === chaveDoDia(agora)) return `Hoje, ${diaDoMes}`;
  if (chaveDoDia(instante) === chaveDoDia(ontem)) return `Ontem, ${diaDoMes}`;
  if (instante.getFullYear() !== agora.getFullYear()) return formatadorComAno.format(instante);
  const semana = formatadorDoDiaDaSemana.format(instante);
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${diaDoMes}`;
}

export function agruparPorDia<T>(itens: T[], instante: (item: T) => string, agora: Date): DiaDaLinhaDoTempo<T>[] {
  const dias: DiaDaLinhaDoTempo<T>[] = [];
  for (const item of itens) {
    const momento = new Date(instante(item));
    const chave = chaveDoDia(momento);
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.chave === chave) ultimo.itens.push(item);
    else dias.push({ chave, nome: nomeDoDia(momento, agora), itens: [item] });
  }
  return dias;
}
