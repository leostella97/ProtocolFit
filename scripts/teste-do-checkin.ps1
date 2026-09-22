# ============================================================================
# teste-do-checkin.ps1 - Valida as novidades na API (modo servidor):
#   1) PATCH /api/perfil/corpo  -> altera peso e altura sem regerar planos
#   2) POST  /api/checkin       -> check-in diario (treino, dieta, agua, peso)
#   3) GET   /api/checkin       -> resumo com sequencia e recorde
# Uso: suba a API (npm run dev:api) e execute este script.
# ============================================================================

$base = "http://localhost:3333/api"

# Cria um usuario unico para a execucao.
$email = "checkin" + (Get-Random -Minimum 10000 -Maximum 99999) + "@example.com"
$cadastro = Invoke-RestMethod -Uri "$base/auth/cadastro" -Method POST -ContentType "application/json" -Body (@{ nome = "Teste Checkin"; email = $email; senha = "senhaSegura123" } | ConvertTo-Json)
$token = $cadastro.token
$cabecalhos = @{ Authorization = "Bearer $token" }

# Cria o perfil (necessario para o check-in).
$perfil = Invoke-RestMethod -Uri "$base/perfil" -Method POST -Headers $cabecalhos -ContentType "application/json" -Body (@{
    sexo = "masculino"; faixa_etaria = "27-31"; peso_kg = 82.5; altura_cm = 178;
    objetivo = "hipertrofia"; frequencia_semanal = 5;
    dias_disponiveis = @("segunda","terca","quarta","quinta","sexta"); modalidade = "academia"
} | ConvertTo-Json)
Write-Output ("Perfil criado: " + $perfil.perfil.peso_kg + " kg / " + $perfil.perfil.altura_cm + " cm")

# Contadores do relatorio.
$total = 0
$falhas = 0

# Funcao de verificacao simples.
function Conferir {
    param([string]$descricao, $esperado, $obtido)
    $script:total += 1
    if ("$esperado" -eq "$obtido") {
        Write-Output ("OK     " + $descricao + ": " + $obtido)
    } else {
        $script:falhas += 1
        Write-Output ("FALHA  " + $descricao + ": esperado=" + $esperado + " obtido=" + $obtido)
    }
}

# --- 1) Alterar peso e altura no painel -------------------------------------
$corpo = Invoke-RestMethod -Uri "$base/perfil/corpo" -Method PATCH -Headers $cabecalhos -ContentType "application/json" -Body (@{ peso_kg = 79.5; altura_cm = 180 } | ConvertTo-Json)
Conferir "Altura alterada" 180 $corpo.perfil.altura_cm
Conferir "Peso alterado" 79.5 $corpo.perfil.peso_kg

# O peso alterado deve entrar na evolucao (um registro por dia).
$evolucao = Invoke-RestMethod -Uri "$base/evolucao" -Headers $cabecalhos
$hoje = (Get-Date).ToString("yyyy-MM-dd")
Conferir "Pesagem do dia registrada" 1 @($evolucao | Where-Object { $_.data -eq $hoje }).Count

# Alterar de novo no mesmo dia nao pode duplicar o ponto do grafico.
Invoke-RestMethod -Uri "$base/perfil/corpo" -Method PATCH -Headers $cabecalhos -ContentType "application/json" -Body (@{ peso_kg = 79.2 } | ConvertTo-Json) | Out-Null
$evolucao2 = Invoke-RestMethod -Uri "$base/evolucao" -Headers $cabecalhos
Conferir "Pesagem do dia nao duplica" 1 @($evolucao2 | Where-Object { $_.data -eq $hoje }).Count
Conferir "Peso atualizado no dia" 79.2 ($evolucao2 | Where-Object { $_.data -eq $hoje })[0].peso_kg

# Validacao: peso fora dos limites deve ser recusado.
try {
    Invoke-RestMethod -Uri "$base/perfil/corpo" -Method PATCH -Headers $cabecalhos -ContentType "application/json" -Body (@{ peso_kg = 500 } | ConvertTo-Json) | Out-Null
    Conferir "Peso invalido recusado" 400 "nao recusou"
} catch { Conferir "Peso invalido recusado" 400 ([int]$_.Exception.Response.StatusCode) }

# --- 2) Check-in diario -----------------------------------------------------
$checkinHoje = Invoke-RestMethod -Uri "$base/checkin" -Method POST -Headers $cabecalhos -ContentType "application/json" -Body (@{
    treino_feito = $true; dieta_seguida = $true; agua_ml = 2500; peso_kg = 79.2; observacao = "Treino A concluido"
} | ConvertTo-Json)
Conferir "Check-in de hoje salvo" "True" $checkinHoje.checkin.treino_feito
Conferir "Agua registrada (ml)" 2500 $checkinHoje.checkin.agua_ml
Conferir "Sequencia com 1 dia" 1 $checkinHoje.sequencia_atual

# Check-ins de ontem e anteontem (sequencia de 3 dias).
$ontem = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
$anteontem = (Get-Date).AddDays(-2).ToString("yyyy-MM-dd")
Invoke-RestMethod -Uri "$base/checkin" -Method POST -Headers $cabecalhos -ContentType "application/json" -Body (@{ data = $ontem; treino_feito = $true; agua_ml = 2000 } | ConvertTo-Json) | Out-Null
$resumo = Invoke-RestMethod -Uri "$base/checkin" -Method POST -Headers $cabecalhos -ContentType "application/json" -Body (@{ data = $anteontem; dieta_seguida = $true; agua_ml = 1800 } | ConvertTo-Json)
Conferir "Sequencia de 3 dias" 3 $resumo.sequencia_atual
Conferir "Recorde de sequencia" 3 $resumo.sequencia_maxima
Conferir "Total de check-ins" 3 $resumo.total
Conferir "Dias cumpridos" 3 $resumo.dias_cumpridos.Count

# Atualizar o mesmo dia nao duplica.
$resumoAtualizado = Invoke-RestMethod -Uri "$base/checkin" -Method POST -Headers $cabecalhos -ContentType "application/json" -Body (@{ agua_ml = 3000 } | ConvertTo-Json)
Conferir "Atualizacao do dia nao duplica" 3 $resumoAtualizado.total
Conferir "Agua atualizada no mesmo dia" 3000 $resumoAtualizado.hoje.agua_ml

# --- 3) Leitura do resumo ---------------------------------------------------
$resumoLido = Invoke-RestMethod -Uri "$base/checkin" -Headers $cabecalhos
Conferir "Resumo lido pelo painel" 3 $resumoLido.total
Conferir "Check-in de hoje presente" "True" ($null -ne $resumoLido.hoje)

# --- Relatorio final -------------------------------------------------------
Write-Output ""
Write-Output "=== CHECK-IN E CORPO: $total verificacoes | $falhas falha(s) ==="
if ($falhas -eq 0) {
    Write-Output "RESULTADO: alteracao de peso/altura e check-in diario funcionando na API."
} else {
    Write-Output "RESULTADO: EXISTEM FALHAS."
    exit 1
}
