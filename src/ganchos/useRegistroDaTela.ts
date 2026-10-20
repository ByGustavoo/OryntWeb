import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAutenticacao } from '@/provedores/ProvedorAutenticacao';
import { telaDoCaminho } from '@/regras/permissoesConta';
import { servicoAdministracao } from '@/servicos';

export function useRegistroDaTela(registrar: boolean): void {
  const { pathname } = useLocation();
  const { atualizarUsuario } = useAutenticacao();
  const ultimo = useRef<string | null>(null);

  useEffect(() => {
    if (!registrar || ultimo.current === pathname || !telaDoCaminho(pathname)) return;
    ultimo.current = pathname;
    void atualizarUsuario();
    servicoAdministracao.registrarAcesso(pathname).catch(() => undefined);
  }, [pathname, registrar, atualizarUsuario]);
}
