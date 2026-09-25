# ============================================================================
# teste-da-api.ps1 — Teste de fumaça ponta a ponta da API do ProtocolFit
# Uso: suba a API (npm run dev:api) e execute este script.
# ============================================================================

# URL base da API.
$base = "http://localhost:3333/api"

# Função auxiliar: executa uma requisição e trata erros sem derrubar o script.
function Requisitar {
    param([string]$metodo, [string]$rota, [object]$corpo, [string]$token)
    $headers = @{}
    # Anexa o token JWT quando fornecido.
    if ($token) { $headers.Authorization = "Bearer $token" }
    try {
        # Executa a chamada HTTP; envia corpo JSON apenas quando houver corpo
        # (mas SEMPRE com Content-Type JSON — o servidor aceita corpo vazio).
        if ($null -eq $corpo) {
            return Invoke-RestMethod -Uri "$base$rota" -Method $metodo -Headers $headers -ContentType "application/json"
        }
        return Invoke-RestMethod -Uri "$base$rota" -Method $metodo -Headers $headers -ContentType "application/json" -Body ($corpo | ConvertTo-Json -Depth 10)
    } catch {
        # Em erro, devolve status e mensagem do servidor para o relatório.
        $status = $_.Exception.Response.StatusCode.value__
        return [pscustomobject]@{ erro = $true; status = $status; mensagem = $_.ErrorDetails.Message }
    }
}

Write-Output "=== 1) Saude ==="
Requisitar "GET" "/saude" $null $null | ConvertTo-Json -Depth 3

Write-Output "=== 2) Opcoes (resumo) ==="
$opcoes = Requisitar "GET" "/opcoes" $null $null
Write-Output ("Faixas etarias: " + $opcoes.faixas_etarias.Count + " | Objetivos: " + $opcoes.objetivos.Count + " | Modalidades: " + $opcoes.modalidades.Count)

# E-mail único por execução (permite rodar o teste várias vezes).
$email = "teste" + (Get-Random -Minimum 1000 -Maximum 9999) + "@example.com"

Write-Output "=== 3) Cadastro ==="
$cadastro = Requisitar "POST" "/auth/cadastro" @{ nome = "Usuario de Teste"; email = $email; senha = "senhaSegura123" } $null
$token = $cadastro.token
Write-Output ("Token recebido: " + [bool]$token)

Write-Output "=== 4) Perfil + geracao de planos ==="
$perfil = Requisitar "POST" "/perfil" @{
    sexo = "masculino"; faixa_etaria = "27-31"; peso_kg = 82.5; altura_cm = 178;
    objetivo = "hipertrofia"; frequencia_semanal = 5; dias_disponiveis = @("segunda","terca","quarta","quinta","sexta");
    modalidade = "academia"; nivel = "iniciante"
} $token
Write-Output ("Treino: " + $perfil.treino.nome + " | dias: " + $perfil.treino.dias + " | dieta v" + $perfil.dieta.versao)
Write-Output ("Meta kcal: " + $perfil.dieta.meta.meta_kcal + " | P: " + $perfil.dieta.meta.proteinas_g + "g | C: " + $perfil.dieta.meta.carboidratos_g + "g | G: " + $perfil.dieta.meta.gorduras_g + "g | Agua: " + $perfil.dieta.meta.agua_ml + "ml")
Write-Output ("Primeiro exercicio: " + $perfil.treino.dias_da_semana[0].exercicios[0].nome + " | carga sugerida: " + $perfil.treino.dias_da_semana[0].exercicios[0].carga_sugerida_kg + " kg")
Write-Output ("Primeiro item da dieta: " + $perfil.dieta.refeicoes[0].itens[0].nome + " | " + $perfil.dieta.refeicoes[0].itens[0].quantidade + "g | " + $perfil.dieta.refeicoes[0].itens[0].calorias + " kcal")

Write-Output "=== 5) Plano atual ==="
$plano = Requisitar "GET" "/plano/atual" $null $token
Write-Output ("Perfil peso: " + $plano.perfil.peso_kg + "kg | treino v" + $plano.treino.versao + " | dieta v" + $plano.dieta.versao)

Write-Output "=== 6) Edicao de exercicio (carga) ==="
$edicao = Requisitar "PATCH" ("/plano/treino/" + $plano.treino.id) @{ dia_indice = 0; exercicio_indice = 0; carga_kg = 45; series = 5 } $token
Write-Output ("Nova carga: " + $edicao.dias_da_semana[0].exercicios[0].carga_sugerida_kg + " kg | series: " + $edicao.dias_da_semana[0].exercicios[0].series)

Write-Output "=== 7) Substituicao de alimento ==="
$substituicao = Requisitar "PATCH" ("/plano/dieta/" + $plano.dieta.id + "/substituir") @{ refeicao_indice = 0; item_indice = 0; alternativa_nome = "Claras de ovo" } $token
Write-Output ("Item apos troca: " + $substituicao.refeicoes[0].itens[0].nome + " | " + $substituicao.refeicoes[0].itens[0].quantidade + "g | alternativa_usada: " + $substituicao.refeicoes[0].itens[0].alternativa_usada)

Write-Output "=== 8) Evolucao + recalculao ==="
Requisitar "POST" "/evolucao" @{ peso_kg = 80.0 } $token | Out-Null
$recalculo = Requisitar "POST" "/perfil/recalcular" $null $token
Write-Output ("Peso atualizado: " + $recalculo.perfil.peso_kg + "kg | treino v" + $recalculo.treino.versao + " | meta kcal: " + $recalculo.dieta.meta.meta_kcal)

Write-Output "=== 8.1) Estilo de treino (variacoes) ==="
# A lista de estilos vem dentro de /opcoes (lida da pasta de modelos mestres).
$totalDeEstilos = @($opcoes.variacoes_de_treino).Count
$temCrossfit = @($opcoes.variacoes_de_treino | Where-Object { $_.id -eq "crossfit" }).Count -gt 0
Write-Output ("Estilos disponiveis: " + $totalDeEstilos + " | crossfit presente: " + $temCrossfit)
# Troca o estilo do treino (o plano do usuario e regenerado na hora).
$comEstilo = Requisitar "PATCH" "/perfil/treino" @{ variacao_treino = "crossfit" } $token
Write-Output ("Estilo gravado: " + $comEstilo.perfil.variacao_treino + " | treino: " + $comEstilo.treino.nome + " | v" + $comEstilo.treino.versao)
# Estilo inexistente deve ser recusado com 400.
$estiloInvalido = Requisitar "PATCH" "/perfil/treino" @{ variacao_treino = "estilo-inexistente" } $token
Write-Output ("Estilo invalido: status " + $estiloInvalido.status)
# Volta ao estilo classico (null).
$semEstilo = Requisitar "PATCH" "/perfil/treino" @{ variacao_treino = $null } $token
Write-Output ("Volta ao padrao: " + $semEstilo.treino.nome)

Write-Output "=== 9) Isolamento (outro usuario nao edita o plano) ==="
$cadastro2 = Requisitar "POST" "/auth/cadastro" @{ nome = "Intruso"; email = "intruso" + (Get-Random -Minimum 1000 -Maximum 9999) + "@example.com"; senha = "senhaSegura123" } $null
$intruso = Requisitar "PATCH" ("/plano/treino/" + $plano.treino.id) @{ dia_indice = 0; exercicio_indice = 0; carga_kg = 999 } $cadastro2.token
Write-Output ("Resposta do intruso: " + $intruso.status + " - " + $intruso.mensagem)

Write-Output "=== 10) Bloqueio de login (3 tentativas erradas = 5 horas) ==="
for ($i = 1; $i -le 3; $i++) {
    $tentativa = Requisitar "POST" "/auth/login" @{ email = $email; senha = "senhaErrada123" } $null
    Write-Output ("Tentativa " + $i + ": status " + $tentativa.status + " - " + $tentativa.mensagem)
}
$loginCorreto = Requisitar "POST" "/auth/login" @{ email = $email; senha = "senhaSegura123" } $null
Write-Output ("Login com senha correta durante bloqueio: status " + $loginCorreto.status + " - " + $loginCorreto.mensagem)

Write-Output "=== FIM ==="
