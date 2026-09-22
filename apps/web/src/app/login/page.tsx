'use client';

// Hooks do React: efeitos e estado.
import { useEffect, useState } from 'react';
// Tipo do evento de envio de formulário.
import type { FormEvent } from 'react';
// Navegação declarativa entre páginas do Next.js.
import Link from 'next/link';
// Roteador para redirecionamentos programáticos.
import { useRouter } from 'next/navigation';
// Animação de entrada do cartão.
import { motion } from 'framer-motion';
// Ícones da interface.
import { AlertCircle, Eye, EyeOff, HeartPulse, Loader2, Lock } from 'lucide-react';
// Autenticação, estado da conta e erro tipado da API.
import { buscarContaAtual, entrarUsuario, ErroDaApi } from '@/lib/api';
// Gestão da sessão no navegador (token e dados do usuário).
import { guardarToken, guardarUsuario, possuiSessao } from '@/lib/armazenamento';
// Constantes de animação do design system.
import { ANIMACAO_DE_ENTRADA, TRANSICAO_SUAVE } from '@/lib/constantes';
// Utilitário de classes condicionais.
import { combinarClasses } from '@/lib/util';
// Componentes de interface prontos do projeto.
import { Botao } from '@/components/ui/button';
import {
  Cartao,
  CartaoCabecalho,
  CartaoConteudo,
  CartaoDescricao,
  CartaoRodape,
  CartaoTitulo,
} from '@/components/ui/card';
import { CampoDeEntrada } from '@/components/ui/input';
import { Rotulo } from '@/components/ui/label';

/** Página de login — autentica e decide o próximo destino do usuário. */
export default function PaginaDeLogin() {
  // Roteador usado para redirecionar após a autenticação.
  const roteador = useRouter();
  // E-mail digitado pelo usuário.
  const [email, definirEmail] = useState('');
  // Senha digitada pelo usuário.
  const [senha, definirSenha] = useState('');
  // Controla a exibição da senha (olho aberto/fechado).
  const [mostrandoSenha, definirMostrandoSenha] = useState(false);
  // Indica o envio em andamento (desabilita o botão).
  const [carregando, definirCarregando] = useState(false);
  // Mensagem de erro exibida no alerta vermelho.
  const [erro, definirErro] = useState<string | null>(null);
  // Marca o erro 423 (conta bloqueada) para destacar com o ícone de cadeado.
  const [contaBloqueada, definirContaBloqueada] = useState(false);

  // Ao montar a página: quem já tem sessão ativa vai direto ao painel.
  useEffect(() => {
    // Verifica o token salvo no navegador.
    if (possuiSessao()) {
      // Substitui a rota para não deixar o login no histórico.
      roteador.replace('/painel');
    }
  }, [roteador]);

  /** Envia as credenciais, guarda a sessão e roteia pelo estado do onboarding. */
  async function aoEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    // Impede o recarregamento da página (comportamento padrão do form).
    evento.preventDefault();
    // Liga o estado de carregamento e limpa erros anteriores.
    definirCarregando(true);
    definirErro(null);
    definirContaBloqueada(false);
    try {
      // Autentica na API com e-mail e senha.
      const resposta = await entrarUsuario({ email: email.trim(), senha });
      // Persiste o token e os dados públicos do usuário.
      guardarToken(resposta.token);
      guardarUsuario(resposta.usuario);
      // Descobre se o onboarding já foi concluído.
      const conta = await buscarContaAtual();
      // Com planos gerados vai ao painel; sem planos, completa o onboarding.
      roteador.replace(conta.possui_planos ? '/painel' : '/onboarding');
      roteador.refresh();
    } catch (erroCapturado) {
      // Erros da API exibem a mensagem já traduzida pelo servidor.
      if (erroCapturado instanceof ErroDaApi) {
        definirErro(erroCapturado.message);
        // O status 423 significa conta temporariamente bloqueada por tentativas.
        definirContaBloqueada(erroCapturado.status === 423);
      } else {
        // Falha de conexão ou erro inesperado.
        definirErro('Não foi possível conectar ao servidor. Tente novamente em instantes.');
      }
    } finally {
      // Encerra o estado de carregamento em qualquer desfecho.
      definirCarregando(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Brilho decorativo atrás do cartão. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      {/* Cartão centralizado com animação de entrada padrão. */}
      <motion.div
        initial={ANIMACAO_DE_ENTRADA.escondido}
        animate={ANIMACAO_DE_ENTRADA.visivel}
        transition={TRANSICAO_SUAVE}
        className="relative w-full max-w-md"
      >
        <Cartao className="sombra-suave">
          <CartaoCabecalho className="items-center gap-3 text-center">
            {/* Logo da marca em gradiente. */}
            <span className="gradiente-marca mx-auto flex size-12 items-center justify-center rounded-xl text-white">
              <HeartPulse className="size-6" />
            </span>
            <CartaoTitulo className="text-2xl">Bem-vindo de volta</CartaoTitulo>
            <CartaoDescricao>Entre para acessar seu treino e sua dieta.</CartaoDescricao>
          </CartaoCabecalho>
          <CartaoConteudo>
            <form onSubmit={aoEnviar} className="flex flex-col gap-4">
              {/* Campo de e-mail. */}
              <div className="flex flex-col gap-2">
                <Rotulo htmlFor="email">E-mail</Rotulo>
                <CampoDeEntrada
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(evento) => definirEmail(evento.target.value)}
                  required
                />
              </div>
              {/* Campo de senha com botão de olho para alternar a visibilidade. */}
              <div className="flex flex-col gap-2">
                <Rotulo htmlFor="senha">Senha</Rotulo>
                <div className="relative">
                  <CampoDeEntrada
                    id="senha"
                    type={mostrandoSenha ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(evento) => definirSenha(evento.target.value)}
                    required
                    className="pr-11"
                  />
                  {/* Alterna entre olho aberto (ocultar) e fechado (mostrar). */}
                  <button
                    type="button"
                    onClick={() => definirMostrandoSenha((atual) => !atual)}
                    aria-label={mostrandoSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {mostrandoSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              {/* Alerta de erro (cadeado quando a conta está bloqueada). */}
              {erro && (
                <div
                  role="alert"
                  className={combinarClasses(
                    'flex items-start gap-2 rounded-md border px-3 py-2 text-sm text-destructive',
                    contaBloqueada ? 'border-destructive bg-destructive/10' : 'border-destructive/40 bg-destructive/5',
                  )}
                >
                  {/* Ícone reforça o bloqueio (423) ou o erro comum. */}
                  {contaBloqueada ? (
                    <Lock className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  )}
                  <span>{erro}</span>
                </div>
              )}
              {/* Botão de envio com spinner durante o carregamento. */}
              <Botao type="submit" variante="gradiente" tamanho="grande" disabled={carregando} className="mt-2 w-full">
                {carregando ? (
                  <>
                    <Loader2 className="animate-spin" /> Entrando…
                  </>
                ) : (
                  'Entrar'
                )}
              </Botao>
            </form>
          </CartaoConteudo>
          <CartaoRodape className="justify-center text-sm text-muted-foreground">
            Ainda não tem conta?{' '}
            <Link href="/cadastro" className="font-semibold text-primary hover:underline">
              Criar conta
            </Link>
          </CartaoRodape>
        </Cartao>
      </motion.div>
    </div>
  );
}
