/**
 * botao-importar-progresso.tsx
 * ---------------------------------------------------------------------------
 * TEAM_001: botão que abre o seletor de arquivos do sistema e entrega o
 * CONTEÚDO do backup (.json) ao componente pai — usado no cartão de
 * portabilidade do perfil e na tela de login ("trocou de dispositivo?").
 *
 * Mantém um <input type="file"> invisível e cuida da leitura do arquivo;
 * erros de leitura/validação chegam ao pai já em mensagem amigável via aoErro.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useRef, useState, type ChangeEvent, type ComponentProps } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Botao } from '@/components/ui/button';

/** Propriedades do botão de importação de progresso. */
interface PropriedadesDoBotaoImportar
  extends Pick<ComponentProps<typeof Botao>, 'variante' | 'tamanho' | 'className'> {
  /** Texto do botão (padrão: "Importar progresso"). */
  rotulo?: string;
  /** Callback com o TEXTO do arquivo escolhido — pode lançar ErroDaApi. */
  aoSelecionar: (conteudo: string) => void | Promise<void>;
  /** Callback de erro (leitura do arquivo ou validação lançada no aoSelecionar). */
  aoErro?: (mensagem: string) => void;
}

/** Botão que dispara o seletor de arquivo e entrega o conteúdo lido ao pai. */
export function BotaoImportarProgresso({
  rotulo = 'Importar progresso',
  variante = 'contorno',
  tamanho,
  className,
  aoSelecionar,
  aoErro,
}: PropriedadesDoBotaoImportar) {
  // Referência ao input de arquivo invisível.
  const entradaDeArquivo = useRef<HTMLInputElement>(null);
  // Leitura/validação em andamento (spinner no botão).
  const [lendo, definirLendo] = useState(false);

  /** Lê o arquivo escolhido e entrega o texto ao componente pai. */
  async function aoMudarArquivo(evento: ChangeEvent<HTMLInputElement>): Promise<void> {
    const arquivo = evento.target.files?.[0];
    // Limpa o input para permitir escolher o MESMO arquivo novamente.
    evento.target.value = '';
    if (!arquivo) {
      return;
    }
    definirLendo(true);
    try {
      // Lê o conteúdo do backup como texto e delega a validação ao pai.
      const conteudo = await arquivo.text();
      await aoSelecionar(conteudo);
    } catch (erro) {
      // Erros da validação (ErroDaApi) já trazem a mensagem amigável.
      aoErro?.(
        erro instanceof Error
          ? erro.message
          : 'Não conseguimos ler o arquivo. Tente escolher o backup novamente.',
      );
    } finally {
      definirLendo(false);
    }
  }

  return (
    <>
      {/* Seletor de arquivo invisível — só aceita o JSON do backup. */}
      <input
        ref={entradaDeArquivo}
        type="file"
        accept="application/json,.json"
        tabIndex={-1}
        aria-hidden
        className="hidden"
        onChange={(evento) => void aoMudarArquivo(evento)}
      />
      <Botao
        type="button"
        variante={variante}
        tamanho={tamanho}
        className={className}
        disabled={lendo}
        onClick={() => entradaDeArquivo.current?.click()}
      >
        {lendo ? <Loader2 className="animate-spin" /> : <Upload />} {rotulo}
      </Botao>
    </>
  );
}
