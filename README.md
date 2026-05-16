# 🔫 Roleta Russa

Um jogo de roleta russa no browser, feito em HTML/CSS/JS puro. Jogue contra um bot com 3 níveis de dificuldade.

## 🎮 Como Jogar

1. Escolha a dificuldade (Fácil / Médio / Difícil)
2. A pistola gira para decidir quem começa
3. No seu turno, você tem até 3 opções:
   - **🔄 SPIN** — Gira o tambor (reseta as chances). Só pode usar 1x por turno. Depois só pode atirar.
   - **🎯 ATIRAR** — Atira em si mesmo
   - **💀 ATIRAR OUTRO** — Atira no bot

## ⚙️ Regras

- Cada câmara tem **1/6 de chance** de ter a bala
- Se usar SPIN, as outras 2 opções ficam disponíveis (sem spin)
- Se atirar em si e a câmara estiver vazia, **você mantém o turno**
- Se atirar no outro e a câmara estiver vazia, o **turno passa**
- Cada jogador tem **3 vidas**
- Quem perder todas as vidas perde o jogo

## 🤖 Dificuldades do Bot

| Dificuldade | Comportamento |
|-------------|--------------|
| Fácil       | Dá spin frequente, hesita mais para atirar |
| Médio       | Comportamento balanceado |
| Difícil     | Quase nunca dá spin, muito agressivo |

## 🚀 Como Rodar

Basta abrir `index.html` no navegador — não precisa de servidor.

Para hospedar no GitHub Pages:
1. Faça upload dos arquivos para um repositório
2. Vá em Settings → Pages → Branch: main / root
3. O jogo vai estar disponível em `https://SEU_USUARIO.github.io/NOME_DO_REPO`

## 📁 Arquivos

```
├── index.html    — Estrutura do jogo
├── style.css     — Visual e animações
├── game.js       — Lógica do jogo
├── images.js     — Imagens em base64 (gerado)
└── README.md     — Este arquivo
```

## 🎨 Créditos

Arte feita manualmente pelo usuário. Jogo desenvolvido com HTML/CSS/JS puro.
