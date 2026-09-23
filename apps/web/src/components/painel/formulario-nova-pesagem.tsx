/**
 * formulario-nova-pesagem.tsx
 * ---------------------------------------------------------------------------
 * Formulário compacto para registrar UMA NOVA PESAGEM direto no cartão
 * "Evolução de peso" do dashboard — sem precisar navegar até a página do
 * perfil. Também serve para registrar a PRIMEIRA pesagem (o gráfico começa
 * a partir dela e passa a mostrar a progressão).
 * ---------------------------------------------------------------------------
 */
'use client';

import { useState } from 'react';
import { Check, Loader2, Plus, Scale } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { CampoDeEntrada } from '@/components/ui/input';
import { Rotulo } from '@/components/ui/label';
import { formatarDecimal } from '@/lib/util';

/** Propriedades do formulário de nova pesagem. */
interface PropriedadesDaNovaPesagem {
  /** Peso atual do perfil (pré-preenche o campo). */
  pesoAtualKg: number;
  /** Chamado com o peso digitado — o painel grava e recarrega o gráfico. */
  aoRegistrar: (pesoKg: number) => Promise<void>;
}

/** Formulário compacto de nova pesagem (dentro do cartão de evolução). */
export function FormularioNovaPesagem({ pesoAtualKg, aoRegistrar }: PropriedadesDaNovaPesagem) {
  // Peso digitado (inicia com o peso atual do perfil).
  const [peso, definirPeso] = useState(formatarDecimal(pesoAtualKg));
  // Controle de salvamento e feedback.
  const [salvando, definirSalvando] = useState(false);
  const [sucesso, definirSucesso] = useState(false);
  const [erro, definirErro] = useState<string | null>(null);

  /** Registra a nova pesagem e avisa o painel para recarregar o gráfico. */
  async function registrar() {
    definirErro(null);
    definirSucesso(false);
    // Converte o texto em número (aceita vírgula decimal).
    const pesoNumerico = Number(peso.replace(',', '.'));
    if (!Number.isFinite(pesoNumerico) || pesoNumerico < 30 || pesoNumerico > 300) {
      definirErro('Informe o peso entre 30 e 300 kg.');
      return;
    }
    definirSalvando(true);
    try {
      // Grava a pesagem do dia (o painel atualiza o gráfico e a progressão).
      await aoRegistrar(pesoNumerico);
      definirSucesso(true);
      window.setTimeout(() => definirSucesso(false), 2500);
    } catch (erroCapturado: unknown) {
      definirErro(erroCapturado instanceof Error ? erroCapturado.message : 'Não foi possível registrar a pesagem.');
    } finally {
      definirSalvando(false);
    }
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <Rotulo htmlFor="nova-pesagem-painel">
        <Scale className="size-3.5 text-primary" /> Nova pesagem (kg)
      </Rotulo>
      {/* Campo + botão lado a lado (o botão fica embaixo em telas estreitas). */}
      <div className="flex flex-wrap items-center gap-2">
        <CampoDeEntrada
          id="nova-pesagem-painel"
          type="number"
          step="0.1"
          min={30}
          max={300}
          className="w-32"
          value={peso}
          onChange={(evento) => definirPeso(evento.target.value)}
        />
        <Botao tamanho="pequeno" onClick={() => void registrar()} disabled={salvando}>
          {salvando ? <Loader2 className="animate-spin" /> : <Plus />}
          {salvando ? 'Registrando...' : 'Registrar pesagem'}
        </Botao>
        {/* Feedback de sucesso ou erro. */}
        {sucesso ? (
          <span className="flex items-center gap-1 text-sm font-medium text-primary">
            <Check className="size-4" /> Registrada ✓
          </span>
        ) : null}
        {erro ? <span className="text-sm font-medium text-destructive">{erro}</span> : null}
      </div>
    </div>
  );
}
