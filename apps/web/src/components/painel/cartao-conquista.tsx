/**
 * cartao-conquista.tsx — TEAM_016
 * ---------------------------------------------------------------------------
 * Cartão de conquista do painel: desenha um PNG 1080×1080 (quadrado, formato
 * Instagram) com o progresso do usuário — sequência de check-ins, total,
 * recorde e evolução de peso — e oferece três formas de levar a imagem em
 * diante:
 *
 *  1. COMPARTILHAR — navigator.share() com o arquivo PNG anexado. É o único
 *     caminho que manda a IMAGEM de verdade para WhatsApp/Instagram (mobile).
 *  2. Links por rede — wa.me e sharer do Facebook aceitam só texto+URL;
 *     Instagram não tem endpoint web → baixa a imagem e abre o app.
 *  3. SALVAR — download direto do PNG.
 *
 * A prévia do card é o próprio <canvas> escalado por CSS: o que o usuário vê
 * é exatamente o que sai no arquivo (WYSIWYG).
 * ---------------------------------------------------------------------------
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Facebook, Instagram, Loader2, MessageCircle, Share2, Trophy } from 'lucide-react';
import { Botao } from '@/components/ui/button';
import { Cartao, CartaoCabecalho, CartaoConteudo, CartaoDescricao, CartaoTitulo } from '@/components/ui/card';
import { formatarDecimal, rotuloDoObjetivo } from '@/lib/util';
import type { Perfil, ResumoDeCheckins } from '@/lib/tipos';

/** Propriedades do cartão de conquista. */
interface PropriedadesDoCartaoConquista {
  /** Perfil vigente (objetivo e dados do plano). */
  perfil: Perfil;
  /** Resumo de check-ins (sequência, recorde e total). */
  checkins: ResumoDeCheckins;
  /** Variação de peso desde a primeira pesagem (kg; null se < 2 registros). */
  deltaDePeso: number | null;
  /** Primeiro nome do usuário, para a assinatura do card. */
  nome: string;
}

/** Dimensão do PNG gerado — 1080×1080 é o quadrado padrão das redes. */
/** Tamanho reduzido 5x (de 1080 para 216) conforme solicitado. */
const TAMANHO_DO_CARD = 216;

/** URL pública exibida no card e nos textos de compartilhamento. */
const URL_DO_SITE = 'leostella97.github.io/ProtocolFit';

/** Nome do arquivo baixado. */
const NOME_DO_ARQUIVO = 'protocolfit-conquista.png';

/** Arredonda um retângulo no contexto do canvas (helper de desenho). */
function retanguloArredondado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  raio: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.arcTo(x + largura, y, x + largura, y + altura, raio);
  ctx.arcTo(x + largura, y + altura, x, y + altura, raio);
  ctx.arcTo(x, y + altura, x, y, raio);
  ctx.arcTo(x, y, x + largura, y, raio);
  ctx.closePath();
}

/**
 * Desenha o card completo no contexto 2D informado.
 * Recebe os dados já formatados para manter a função pura de desenho.
 */
function desenharCardDeConquista(
  ctx: CanvasRenderingContext2D,
  dados: {
    destaque: string;
    rotuloDoDestaque: string;
    estatisticas: { rotulo: string; valor: string }[];
    nome: string;
    dataFormatada: string;
    rotuloDoObjetivo: string;
  },
) {
  const S = TAMANHO_DO_CARD;

  // Fundo: gradiente diagonal verde-escuro (identidade do produto).
  const gradienteFundo = ctx.createLinearGradient(0, 0, S, S);
  gradienteFundo.addColorStop(0, '#0d241a');
  gradienteFundo.addColorStop(0.55, '#123a28');
  gradienteFundo.addColorStop(1, '#0b1d15');
  ctx.fillStyle = gradienteFundo;
  ctx.fillRect(0, 0, S, S);

  // Brilho radial sutil atrás do número de destaque.
  const brilho = ctx.createRadialGradient(S / 2, S * 0.44, 60, S / 2, S * 0.44, 560);
  brilho.addColorStop(0, 'rgba(74, 222, 128, 0.22)');
  brilho.addColorStop(1, 'rgba(74, 222, 128, 0)');
  ctx.fillStyle = brilho;
  ctx.fillRect(0, 0, S, S);

  // Moldura fina interna.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 3;
  retanguloArredondado(ctx, 36, 36, S - 72, S - 72, 40);
  ctx.stroke();

  // ── Cabeçalho: troféu + wordmark centrados ─────────────────────────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '54px "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText('🏆', S / 2 - 190, 150);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 52px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ProtocolFit', S / 2 - 140, 152);

  // Divisor fino sob o cabeçalho.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 220);
  ctx.lineTo(S - 160, 220);
  ctx.stroke();

  // ── Destaque central: número gigante + rótulo ──────────────────────────
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4ade80';
  ctx.font = '800 260px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(dados.destaque, S / 2, S * 0.46);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.font = '600 54px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(dados.rotuloDoDestaque.toUpperCase(), S / 2, S * 0.46 + 190);

  // ── Grade de 3 estatísticas ────────────────────────────────────────────
  const larguraDaCaixa = 264;
  const alturaDaCaixa = 190;
  const espacoEntre = 32;
  const xInicial = (S - (larguraDaCaixa * 3 + espacoEntre * 2)) / 2;
  const yCaixas = S * 0.66;

  dados.estatisticas.forEach((estatistica, indice) => {
    const x = xInicial + indice * (larguraDaCaixa + espacoEntre);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    retanguloArredondado(ctx, x, yCaixas, larguraDaCaixa, alturaDaCaixa, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    retanguloArredondado(ctx, x, yCaixas, larguraDaCaixa, alturaDaCaixa, 24);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 64px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(estatistica.valor, x + larguraDaCaixa / 2, yCaixas + 82);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '500 30px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(estatistica.rotulo.toUpperCase(), x + larguraDaCaixa / 2, yCaixas + 142);
  });

  // ── Rodapé: nome · data · objetivo · site ──────────────────────────────
  const assinatura = dados.nome ? `${dados.nome} · ` : '';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '600 36px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`${assinatura}${dados.rotuloDoObjetivo} · ${dados.dataFormatada}`, S / 2, S - 170);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '500 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(URL_DO_SITE, S / 2, S - 110);
}

/** Cartão que gera e compartilha a imagem de conquista do usuário. */
export function CartaoConquista({ perfil, checkins, deltaDePeso, nome }: PropriedadesDoCartaoConquista) {
  // Canvas que serve de prévia (elemento visível) e de origem do PNG.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Indica que o navegador aceita navigator.share com arquivos (mobile).
  const [compartilhaArquivos, definirCompartilhaArquivos] = useState(false);
  // Estado de geração do arquivo para compartilhar/baixar.
  const [gerando, definirGerando] = useState(false);
  // Dica exibida após o fluxo do Instagram (download + abrir o site/app).
  const [dicaDoInstagram, definirDicaDoInstagram] = useState(false);

  // Número de destaque do card: sequência atual → total → "1º" (jornada nova).
  const destaque = checkins.sequencia_atual > 0 ? String(checkins.sequencia_atual)
    : checkins.total > 0 ? String(checkins.total)
    : '1º';
  const rotuloDoDestaque = checkins.sequencia_atual > 0
    ? (checkins.sequencia_atual === 1 ? 'dia seguido de treino' : 'dias seguidos de treino')
    : checkins.total > 0 ? 'check-ins concluídos' : 'da jornada';

  // Terceira estatística: kg evoluído quando há delta, senão o objetivo.
  // Memoizada — a identidade do objeto entra nas deps do efeito de desenho.
  const terceiraEstatistica = useMemo(
    () =>
      deltaDePeso !== null && deltaDePeso !== 0
        ? { rotulo: 'kg evoluídos', valor: `${deltaDePeso > 0 ? '+' : '−'}${formatarDecimal(Math.abs(deltaDePeso))}` }
        : { rotulo: 'objetivo', valor: rotuloDoObjetivo(perfil.objetivo) },
    [deltaDePeso, perfil.objetivo],
  );

  // Redesenha a prévia sempre que os dados da conquista mudam.
  useEffect(() => {
    const contexto = canvasRef.current?.getContext('2d');
    if (contexto) {
      desenharCardDeConquista(contexto, {
        destaque,
        rotuloDoDestaque,
        estatisticas: [
          { rotulo: 'check-ins', valor: String(checkins.total) },
          { rotulo: 'recorde', valor: `${checkins.sequencia_maxima}d` },
          terceiraEstatistica,
        ],
        nome,
        dataFormatada: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        rotuloDoObjetivo: rotuloDoObjetivo(perfil.objetivo),
      });
    }
  }, [destaque, rotuloDoDestaque, terceiraEstatistica, checkins.total, checkins.sequencia_maxima, nome, perfil.objetivo]);

  // Detecta suporte a compartilhamento de arquivo (guard: navigator existe só no cliente).
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'canShare' in navigator && 'share' in navigator) {
      try {
        const arquivoDeTeste = new File([new Blob()], 'teste.png', { type: 'image/png' });
        definirCompartilhaArquivos(navigator.canShare({ files: [arquivoDeTeste] }));
      } catch {
        definirCompartilhaArquivos(false);
      }
    }
  }, []);

  /** Frase de compartilhamento usada nos links de texto. */
  const textoDeCompartilhamento = useCallback(() => {
    const quem = nome ? `${nome} está` : 'Estou';
    const parteDaSequencia =
      checkins.sequencia_atual > 0
        ? `há ${checkins.sequencia_atual} dia${checkins.sequencia_atual === 1 ? '' : 's'} seguido${checkins.sequencia_atual === 1 ? '' : 's'} de treino`
        : `com ${checkins.total} check-in${checkins.total === 1 ? '' : 's'} concluído${checkins.total === 1 ? '' : 's'}`;
    const parteDoPeso =
      deltaDePeso !== null && deltaDePeso !== 0
        ? ` e ${formatarDecimal(Math.abs(deltaDePeso))} kg ${deltaDePeso < 0 ? 'a menos' : 'a mais'}`
        : '';
    return `${quem} ${parteDaSequencia}${parteDoPeso} no ProtocolFit! 💪 Objetivo: ${rotuloDoObjetivo(perfil.objetivo)}. ${URL_DO_SITE}`;
  }, [nome, checkins.sequencia_atual, checkins.total, deltaDePeso, perfil.objetivo]);

  /** Extrai o PNG do canvas como Blob (promessa sobre o callback do toBlob). */
  function gerarBlob(): Promise<Blob> {
    return new Promise((resolver, rejeitar) => {
      canvasRef.current?.toBlob((blob) => {
        if (blob) {
          resolver(blob);
        } else {
          rejeitar(new Error('Falha ao gerar a imagem.'));
        }
      }, 'image/png');
    });
  }

  /** Dispara o download do PNG no dispositivo do usuário. */
  async function baixarImagem() {
    definirGerando(true);
    try {
      const blob = await gerarBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = NOME_DO_ARQUIVO;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      definirGerando(false);
    }
  }

  /** Compartilha o PNG via planilha nativa (mobile cobre WhatsApp/Instagram). */
  async function compartilharImagem() {
    definirGerando(true);
    try {
      const blob = await gerarBlob();
      const arquivo = new File([blob], NOME_DO_ARQUIVO, { type: 'image/png' });
      await navigator.share({
        files: [arquivo],
        title: 'Minha conquista no ProtocolFit',
        text: textoDeCompartilhamento(),
      });
    } catch {
      // Usuário cancelou a planilha ou o navegador recusou — não é erro de tela.
    } finally {
      definirGerando(false);
    }
  }

  /** WhatsApp web/app: texto + link (o URL scheme não anexa imagem). */
  function compartilharNoWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(textoDeCompartilhamento())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /** Facebook sharer: link do site + frase da conquista. */
  function compartilharNoFacebook() {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://${URL_DO_SITE}`)}&quote=${encodeURIComponent(textoDeCompartilhamento())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /** Instagram não tem API web de post: baixa o PNG e abre o app/site. */
  async function compartilharNoInstagram() {
    await baixarImagem();
    definirDicaDoInstagram(true);
    window.open('https://www.instagram.com', '_blank', 'noopener,noreferrer');
  }

  return (
    <Cartao>
      <CartaoCabecalho>
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <CartaoTitulo>Card de conquista</CartaoTitulo>
        </div>
        <CartaoDescricao>
          Gere sua imagem de progresso e compartilhe nas redes
        </CartaoDescricao>
      </CartaoCabecalho>
      <CartaoConteudo className="space-y-4">
        {/* Prévia 1:1 do PNG que será exportado. */}
        <canvas
          ref={canvasRef}
          width={TAMANHO_DO_CARD}
          height={TAMANHO_DO_CARD}
          className="w-[216px] h-[216px] rounded-xl border border-border"
          aria-label="Prévia do card de conquista"
        />

        {/* Ações principais: compartilhar (nativo, quando há) e salvar. */}
        <div className="flex flex-wrap gap-2">
          {compartilhaArquivos ? (
            <Botao tamanho="pequeno" onClick={() => void compartilharImagem()} disabled={gerando}>
              {gerando ? <Loader2 className="animate-spin" /> : <Share2 />}
              Compartilhar
            </Botao>
          ) : null}
          <Botao
            tamanho="pequeno"
            variante={compartilhaArquivos ? 'contorno' : 'padrao'}
            onClick={() => void baixarImagem()}
            disabled={gerando}
          >
            {gerando && !compartilhaArquivos ? <Loader2 className="animate-spin" /> : <Download />}
            Salvar imagem
          </Botao>
        </div>

        {/* Atalhos por rede (texto+link; imagem vai só no share nativo). */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Compartilhar em
          </p>
          <div className="flex flex-wrap gap-2">
            <Botao tamanho="pequeno" variante="contorno" onClick={compartilharNoWhatsApp}>
              <MessageCircle />
              WhatsApp
            </Botao>
            <Botao tamanho="pequeno" variante="contorno" onClick={compartilharNoFacebook}>
              <Facebook />
              Facebook
            </Botao>
            <Botao tamanho="pequeno" variante="contorno" onClick={() => void compartilharNoInstagram()}>
              <Instagram />
              Instagram
            </Botao>
          </div>
          <p className="text-xs text-muted-foreground">
            {dicaDoInstagram
              ? 'Imagem baixada! No Instagram, poste pelo feed ou story.'
              : 'No Instagram, a imagem é baixada e você posta no feed ou story.'}
          </p>
        </div>
      </CartaoConteudo>
    </Cartao>
  );
}
