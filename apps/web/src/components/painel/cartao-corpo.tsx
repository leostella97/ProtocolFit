/**
 * cartao-corpo.tsx
 * ---------------------------------------------------------------------------
 * Cartão "Meus dados corporais" do painel: permite ao usuário ALTERAR o peso
 * e a ALTURA direto na página inicial do painel, sem passar pelo onboarding.
 *
 * Layout pedido: a ALTURA aparece ACIMA do PESO.
 *
 * Salvar aqui NÃO regenera o plano (isso é intencional): o usuário corrige os
 * dados e, quando quiser, usa o botão "Recalcular" para renovar treino e dieta.
 * O peso informado também entra no gráfico de evolução do dia.
 * ---------------------------------------------------------------------------
 */
'use client';

import { useState } from 'react';
import { Check, Loader2, Ruler, Scale } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { Cartao, CartaoCabecalho, CartaoConteudo, CartaoDescricao, CartaoTitulo } from '@/components/ui/card';
import { CampoDeEntrada } from '@/components/ui/input';
import { Rotulo } from '@/components/ui/label';
import { atualizarCorpo } from '@/lib/api';
import type { Perfil } from '@/lib/tipos';
import { formatarDecimal } from '@/lib/util';

/** Propriedades do cartão de dados corporais. */
interface PropriedadesDoCartaoCorpo {
  /** Perfil atual do usuário (peso e altura exibidos/editados). */
  perfil: Perfil;
  /** Chamado com o perfil atualizado após salvar. */
  aoAtualizarPerfil: (perfil: Perfil) => void;
}

/** Cartão de edição de peso e altura do usuário. */
export function CartaoCorpo({ perfil, aoAtualizarPerfil }: PropriedadesDoCartaoCorpo) {
  // Altura digitada (em centímetros) — começa com o valor do perfil.
  const [altura, definirAltura] = useState(String(perfil.altura_cm));
  // Peso digitado (em kg) — começa com o valor do perfil.
  const [peso, definirPeso] = useState(String(perfil.peso_kg));
  // Controla o estado de salvamento.
  const [salvando, definirSalvando] = useState(false);
  // Mensagem de sucesso exibida após salvar.
  const [sucesso, definirSucesso] = useState(false);
  // Mensagem de erro (validação do servidor ou do navegador).
  const [erro, definirErro] = useState<string | null>(null);

  /** Salva a altura e/ou o peso informados. */
  async function salvarDadosCorporais() {
    definirErro(null);
    definirSucesso(false);

    // Converte os textos em números (aceita vírgula como separador decimal).
    const alturaNumerica = Number(altura.replace(',', '.'));
    const pesoNumerico = Number(peso.replace(',', '.'));

    // Validações locais com mensagens claras.
    if (!Number.isFinite(alturaNumerica) || alturaNumerica < 100 || alturaNumerica > 230) {
      definirErro('Informe a altura entre 100 e 230 cm.');
      return;
    }
    if (!Number.isFinite(pesoNumerico) || pesoNumerico < 30 || pesoNumerico > 300) {
      definirErro('Informe o peso entre 30 e 300 kg.');
      return;
    }

    definirSalvando(true);
    try {
      // Envia apenas os campos que mudaram (edição parcial).
      const corpo: { peso_kg?: number; altura_cm?: number } = {};
      if (alturaNumerica !== perfil.altura_cm) {
        corpo.altura_cm = alturaNumerica;
      }
      if (pesoNumerico !== perfil.peso_kg) {
        corpo.peso_kg = pesoNumerico;
      }
      // Nada mudou: evita uma chamada desnecessária.
      if (corpo.peso_kg === undefined && corpo.altura_cm === undefined) {
        definirSucesso(true);
        window.setTimeout(() => definirSucesso(false), 2000);
        return;
      }
      // Persiste a alteração e atualiza a tela.
      const resposta = await atualizarCorpo(corpo);
      aoAtualizarPerfil(resposta.perfil);
      definirSucesso(true);
      window.setTimeout(() => definirSucesso(false), 2500);
    } catch (erroCapturado: unknown) {
      definirErro(erroCapturado instanceof Error ? erroCapturado.message : 'Não foi possível salvar. Tente novamente.');
    } finally {
      definirSalvando(false);
    }
  }

  return (
    <Cartao className="gap-4">
      <CartaoCabecalho>
        <CartaoTitulo>Meus dados corporais</CartaoTitulo>
        <CartaoDescricao>Atualize seu peso e sua altura quando quiser</CartaoDescricao>
      </CartaoCabecalho>
      <CartaoConteudo className="space-y-4">
        {/* ALTURA — exibida acima do peso, como solicitado. */}
        <div className="space-y-1.5">
          <Rotulo htmlFor="corpo-altura">
            <Ruler className="size-3.5 text-primary" /> Altura (cm)
          </Rotulo>
          <CampoDeEntrada
            id="corpo-altura"
            type="number"
            step="1"
            min={100}
            max={230}
            value={altura}
            onChange={(evento) => definirAltura(evento.target.value)}
          />
        </div>

        {/* PESO — logo abaixo da altura. */}
        <div className="space-y-1.5">
          <Rotulo htmlFor="corpo-peso">
            <Scale className="size-3.5 text-primary" /> Peso (kg)
          </Rotulo>
          <CampoDeEntrada
            id="corpo-peso"
            type="number"
            step="0.1"
            min={30}
            max={300}
            value={peso}
            onChange={(evento) => definirPeso(evento.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Peso atual no plano: {formatarDecimal(perfil.peso_kg)} kg · o valor salvo entra no gráfico de evolução.
          </p>
        </div>

        {/* Ação de salvar + feedback de sucesso/erro. */}
        <div className="flex flex-wrap items-center gap-3">
          <Botao tamanho="pequeno" onClick={() => void salvarDadosCorporais()} disabled={salvando}>
            {salvando ? <Loader2 className="animate-spin" /> : <Check />}
            {salvando ? 'Salvando...' : 'Salvar dados'}
          </Botao>
          {sucesso ? <span className="text-sm font-medium text-primary">Dados atualizados ✓</span> : null}
          {erro ? <span className="text-sm font-medium text-destructive">{erro}</span> : null}
        </div>
      </CartaoConteudo>
    </Cartao>
  );
}
