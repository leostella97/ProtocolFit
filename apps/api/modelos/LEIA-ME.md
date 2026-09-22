# Pasta /modelos — Modelos JSON Mestres do ProtocolFit

> ⚠️ **Somente leitura.** Estes arquivos são os modelos MESTRES do servidor.
> Nenhuma rota da API escreve aqui. Cada usuário recebe uma **cópia clonada**
> do plano montado na tabela `planos` do SQLite — as edições acontecem apenas
> na cópia individual.

## Estrutura de pastas

```
modelos/
├── treinos/
│   ├── academia/                  # treinos com pesos e máquinas
│   │   ├── hipertrofia/           # 2dias.json ... 7dias.json (6 arquivos)
│   │   ├── emagrecimento/         # 2dias.json ... 7dias.json (6 arquivos)
│   │   └── corrida/               # 2dias.json ... 7dias.json (6 arquivos)
│   └── pesocorporal/              # calistenia, sem equipamentos
│       ├── hipertrofia/           # 2dias.json ... 7dias.json (6 arquivos)
│       ├── emagrecimento/         # 2dias.json ... 7dias.json (6 arquivos)
│       └── corrida/               # 2dias.json ... 7dias.json (6 arquivos)
└── dietas/
    ├── emagrecimento.json
    ├── hipertrofia.json
    └── corrida.json
```

> **Matriz completa (36 treinos):** toda combinação selecionável no site
> (2 modalidades × 3 objetivos × 6 quantidades de dias, de 2 a 7) tem seu
> arquivo JSON exato. O vínculo com o usuário é explícito: a coluna
> `modelo_origem` do SQLite e o campo `modelo_origem` da API registram o
> caminho do modelo mestre usado na clonagem (ex.: `treinos/academia/corrida/4dias.json`).
>
> O fallback determinístico em `src/motor/carregadorModelos.ts` continua
> existindo apenas como rede de segurança para casos fora da matriz
> (ex.: usuário que marca 1 único dia disponível).

## Esquema do modelo de treino (`treinos/**/*.json`)

```jsonc
{
  "nome": "Nome do modelo",               // exibido no painel
  "modalidade": "academia",               // academia | pesocorporal
  "objetivo": "hipertrofia",              // emagrecimento | hipertrofia | corrida
  "dias": 3,                              // quantidade de dias do modelo
  "duracao_estimada_min": 60,             // tempo estimado por sessão
  "dias_da_semana": [                     // estrutura dos dias
    {
      "titulo": "Dia A — Peito...",
      "exercicios": [
        {
          "nome": "Supino reto com barra",
          "grupo": "peito",               // grupo muscular
          "tipo": "composto",             // composto | isolador | cardio | corporal
          "series": 4,                    // séries de REFERÊNCIA (o motor pode sobrescrever)
          "repeticoes_min": 8,            // faixa de referência
          "repeticoes_max": 12,
          "descanso_segundos": 90,        // descanso de referência
          "percentual_carga_peso_corporal": 0.5, // fração do peso corporal sugerida como carga (null = sem carga)
          "dicas": "Dica de execução."
        }
      ]
    }
  ]
}
```

**Regra de montagem por objetivo** (aplicada em `src/motor/montadorPlano.ts`):

| Objetivo       | Séries | Repetições | Descanso |
| -------------- | ------ | ---------- | -------- |
| Emagrecimento  | 3      | 12 a 15    | 60 s     |
| Hipertrofia    | 4      | 8 a 12     | 90 s     |
| Corrida        | 3      | 10 a 12    | 60 s     |

A carga inicial sugerida é `peso_kg × percentual_carga_peso_corporal`,
arredondada para múltiplos de 2,5 kg.

## Esquema do modelo de dieta (`dietas/*.json`)

```jsonc
{
  "nome": "Dieta para Emagrecimento — déficit de 20%",
  "objetivo": "emagrecimento",
  "refeicoes": [
    {
      "tipo": "Café da manhã",
      "horario_sugerido": "07:00",
      "percentual_calorias": 0.25,        // fração das calorias diárias da refeição (soma = 1,0)
      "itens": [
        {
          "nome": "Ovos inteiros",
          "categoria": "proteina",        // proteina | carboidrato | gordura | fruta | vegetal | leguminosa
          "percentual_da_refeicao": 0.5,  // fração das calorias DA REFEIÇÃO do item (soma = 1,0)
          "calorias_por_100g": 155,       // densidade nutricional (base para o cálculo dos gramas)
          "proteinas_por_100g": 13,
          "carboidratos_por_100g": 1.1,
          "gorduras_por_100g": 11,
          "unidade": "g",                 // g | ml
          "alternativas": [               // substitutos equivalentes (mesma categoria)
            { "nome": "Claras de ovo", "calorias_por_100g": 52, "proteinas_por_100g": 11, "carboidratos_por_100g": 0.7, "gorduras_por_100g": 0.2 }
          ]
        }
      ]
    }
  ]
}
```

**Cálculo da quantidade em gramas** (motor determinístico):

```
calorias_da_refeicao = meta_kcal × percentual_calorias
alvo_calorias_item   = calorias_da_refeicao × percentual_da_refeicao
gramas_do_item       = alvo_calorias_item ÷ calorias_por_100g × 100  (arredondado p/ múltiplos de 5)
```

Ao substituir um alimento, o motor recalcula os gramas mantendo o mesmo
`alvo_calorias` — o equilíbrio calórico do plano é preservado.

## Como adicionar um novo modelo

1. Crie o arquivo JSON na pasta correspondente (`{modalidade}/{objetivo}/{dias}dias.json`).
2. Siga exatamente o esquema acima (o backend valida os campos em runtime).
3. Reinicie a API — o modelo passa a ser selecionável automaticamente pelo
   cruzamento de filtros, sem nenhuma mudança de código.
