/**
 * cartao-portabilidade.tsx
 * ---------------------------------------------------------------------------
 * TEAM_001: cartão "Leve seu progresso com você" — exibido em Meu perfil.
 *
 *  - EXPORTAR: baixa um arquivo JSON com conta, perfil, planos, pesagens e
 *    check-ins (o progresso inteiro, que só mora neste navegador).
 *  - IMPORTAR: lê um backup salvo, mostra uma PRÉVIA do que foi encontrado
 *    (dono, data e totais) e só grava depois da confirmação — a sessão é
 *    aberta na conta restaurada e a aplicação recarrega no painel.
 *
 * Só aparece no modo navegador (MODO_LOCAL): no modo servidor os dados já
 * ficam no backend e basta entrar na conta pelo outro dispositivo.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import {
  Cartao,
  CartaoCabecalho,
  CartaoConteudo,
  CartaoDescricao,
  CartaoTitulo,
} from '@/components/ui/card';
import { BotaoImportarProgresso } from '@/components/portabilidade/botao-importar-progresso';
import { ErroDaApi, exportarProgresso, importarProgresso, inspecionarBackup, MODO_LOCAL, type ResumoDoBackup } from '@/lib/api';
import { encerrarSessao } from '@/lib/armazenamento';

/** Backup escolhido aguardando a confirmação do usuário. */
interface ImportacaoPendente {
  /** Texto bruto do arquivo (validado na prévia, revalidado na gravação). */
  conteudo: string;
  /** Resumo exibido na prévia (dono, data e totais). */
  resumo: ResumoDoBackup;
}

/** Formata a data/hora ISO do backup em pt-BR para a prévia. */
function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? 'data desconhecida' : data.toLocaleString('pt-BR');
}

/** Cartão de portabilidade do perfil (visível apenas no modo navegador). */
export function CartaoPortabilidade() {
  const roteador = useRouter();
  // Exportação em andamento + feedback de sucesso/erro.
  const [exportando, definirExportando] = useState(false);
  const [mensagemDeExportacao, definirMensagemDeExportacao] = useState<string | null>(null);
  const [erroDeExportacao, definirErroDeExportacao] = useState<string | null>(null);
  // Importação: backup aguardando confirmação + gravação em andamento.
  const [pendente, definirPendente] = useState<ImportacaoPendente | null>(null);
  const [importando, definirImportando] = useState(false);
  const [erroDeImportacao, definirErroDeImportacao] = useState<string | null>(null);

  // Fora do modo navegador o recurso não existe (login já resolve no servidor).
  if (!MODO_LOCAL) {
    return null;
  }

  /** Gera o backup e força o download do arquivo JSON. */
  async function baixarProgresso(): Promise<void> {
    definirExportando(true);
    definirMensagemDeExportacao(null);
    definirErroDeExportacao(null);
    try {
      const { nomeDoArquivo, conteudo } = await exportarProgresso();
      // Download via blob + âncora temporária (sem servidor envolvido).
      const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
      const ancora = document.createElement('a');
      ancora.href = url;
      ancora.download = nomeDoArquivo;
      ancora.click();
      URL.revokeObjectURL(url);
      definirMensagemDeExportacao('Prontinho! Seu progresso foi baixado. Guarde o arquivo com carinho — ele é a chave da sua jornada.');
    } catch (erro) {
      // Sessão inválida: limpa e volta ao login.
      if (erro instanceof ErroDaApi && erro.status === 401) {
        encerrarSessao();
        roteador.replace('/login');
        return;
      }
      definirErroDeExportacao(
        erro instanceof Error ? erro.message : 'Não foi possível exportar seu progresso.',
      );
    } finally {
      definirExportando(false);
    }
  }

  /** Valida o arquivo escolhido e prepara a prévia de confirmação. */
  function prepararImportacao(conteudo: string): void {
    // Lança ErroDaApi(400) quando o arquivo não é um backup válido —
    // o botão repassa a mensagem para o estado de erro.
    const resumo = inspecionarBackup(conteudo);
    definirErroDeImportacao(null);
    definirPendente({ conteudo, resumo });
  }

  /** Confirma a importação: grava o backup e recarrega na conta restaurada. */
  async function confirmarImportacao(): Promise<void> {
    if (!pendente) {
      return;
    }
    definirImportando(true);
    definirErroDeImportacao(null);
    try {
      const resultado = await importarProgresso(pendente.conteudo);
      // Recarga completa: a sessão pode ter trocado de conta e todos os
      // estados em memória precisam refletir o snapshot restaurado. O
      // NEXT_PUBLIC_BASE_PATH mantém o prefixo do site estático (/ProtocolFit).
      const caminhoBase = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
      window.location.assign(`${caminhoBase}${resultado.possui_planos ? '/painel' : '/onboarding'}`);
    } catch (erro) {
      definirErroDeImportacao(
        erro instanceof Error ? erro.message : 'Não foi possível importar este backup.',
      );
      definirImportando(false);
    }
  }

  return (
    <Cartao>
      <CartaoCabecalho>
        <CartaoTitulo>Leve seu progresso com você</CartaoTitulo>
        <CartaoDescricao>
          Seus dados moram neste navegador — nada fica na nuvem. Baixe seu progresso em um
          arquivo e, no outro dispositivo, é só importar para continuar de onde parou.
        </CartaoDescricao>
      </CartaoCabecalho>
      <CartaoConteudo className="space-y-4">
        {/* Aviso de cuidado: o arquivo é a chave da conta e do histórico. */}
        <p className="flex items-start gap-2 rounded-lg bg-secondary/60 px-3 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            O arquivo guarda sua conta e todo o seu histórico — trate-o como uma senha e
            compartilhe só com os seus dispositivos.
          </span>
        </p>

        {/* Confirmação em duas etapas: prévia do backup antes de gravar. */}
        {pendente ? (
          <div className="space-y-3 rounded-xl border border-primary/40 bg-secondary/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              Encontramos o progresso de {pendente.resumo.nome}
            </p>
            <p className="text-xs text-muted-foreground">
              {pendente.resumo.email} · salvo em {formatarDataHora(pendente.resumo.exportado_em)} ·{' '}
              {pendente.resumo.total_planos} plano(s) · {pendente.resumo.total_pesagens} pesagem(ns) ·{' '}
              {pendente.resumo.total_checkins} check-in(s)
            </p>
            <p className="text-xs text-muted-foreground">
              Ao continuar, você entra nessa conta e os dados deste navegador são substituídos
              pelos do arquivo.
            </p>
            <div className="flex flex-wrap gap-2">
              <Botao
                variante="gradiente"
                tamanho="pequeno"
                disabled={importando}
                onClick={() => void confirmarImportacao()}
              >
                {importando ? <Loader2 className="animate-spin" /> : <Upload />} Sim, importar
              </Botao>
              <Botao
                variante="fantasma"
                tamanho="pequeno"
                disabled={importando}
                onClick={() => definirPendente(null)}
              >
                Agora não
              </Botao>
            </div>
          </div>
        ) : null}

        {/* Ações principais: exportar (download) e importar (seletor de arquivo). */}
        <div className="flex flex-wrap items-center gap-3">
          <Botao variante="contorno" disabled={exportando} onClick={() => void baixarProgresso()}>
            {exportando ? <Loader2 className="animate-spin" /> : <Download />} Exportar progresso
          </Botao>
          <BotaoImportarProgresso aoSelecionar={prepararImportacao} aoErro={definirErroDeImportacao} />
        </div>

        {/* Feedback de sucesso/erro das duas operações. */}
        {mensagemDeExportacao ? (
          <p className="text-sm font-medium text-primary">{mensagemDeExportacao}</p>
        ) : null}
        {erroDeExportacao ? (
          <p className="text-sm font-medium text-destructive">{erroDeExportacao}</p>
        ) : null}
        {erroDeImportacao ? (
          <p className="text-sm font-medium text-destructive">{erroDeImportacao}</p>
        ) : null}
      </CartaoConteudo>
    </Cartao>
  );
}
