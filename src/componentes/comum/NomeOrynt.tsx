import { NOME_APLICACAO } from '@/configuracoes/aplicacao';
import { juntarClasses } from '@/utilitarios/juntarClasses';
import estilos from './NomeOrynt.module.css';

interface NomeOryntProps {
  className?: string;
}

export function NomeOrynt({ className }: NomeOryntProps) {
  return <span className={juntarClasses(estilos.nome, className)}>{NOME_APLICACAO}</span>;
}
