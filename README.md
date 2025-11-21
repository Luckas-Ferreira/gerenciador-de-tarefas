# Rastreador de Foco e Produtividade ⏱️

Esta é uma aplicação web minimalista e eficiente projetada para otimizar
o fluxo de trabalho diário. Ela combina um cronômetro de foco (estilo
Pomodoro) com um contador de produtividade, permitindo aos colaboradores
monitorar quantas tarefas foram realizadas e o tempo total dedicado.

## ✨ Funcionalidades

-   **Cronômetro Flexível:** O usuário define o tempo que desejar para
    cada tarefa (padrão de 10 minutos, ajustável).\
-   **Feedback Visual:** Barra de progresso que preenche conforme o
    tempo passa, auxiliando na gestão do tempo.\
-   **Contador de Tarefas:** Incrementa automaticamente ao fim do tempo,
    com opções manuais de ajuste (+/-) para correções rápidas.\
-   **Totalizador de Tempo:** Calcula automaticamente o tempo total
    focado no dia (ex: 3 tarefas de 10 min = 30 min de produção).\
-   **Alarme Sonoro:** Emite um aviso sonoro suave ao finalizar o tempo
    (utilizando Web Audio API, sem dependência de arquivos externos).\
-   **Design Responsivo:** Interface moderna (Dark Mode), perfeita para
    uso em desktops ou dispositivos móveis.

## 🚀 Tecnologias Utilizadas

-   **HTML5:** Estrutura semântica.\
-   **JavaScript (ES6+):** Lógica do cronômetro, processamento de áudio
    e contagem de métricas.\
-   **Tailwind CSS (via CDN):** Estilização rápida, moderna e
    responsiva.\
-   **FontAwesome:** Ícones para interface intuitiva.

## 📂 Instalação e Uso

Este projeto foi construído com a arquitetura Single File (arquivo
único), facilitando a distribuição interna e o uso imediato sem
configurações complexas.

### Pré-requisitos

Apenas um navegador web moderno (Chrome, Firefox, Edge, Safari). Não é
necessário instalar Node.js ou servidores locais.

### Como Rodar

1.  Baixe o arquivo `index.html` deste repositório.\
2.  Dê dois cliques no arquivo para abri-lo em seu navegador padrão.\
3.  O sistema está pronto para uso.

## 📖 Guia de Operação

1.  **Definição de Meta:** No topo da tela, ajuste o tempo estimado para
    a tarefa usando os botões + ou -.\
2.  **Iniciar Atividade:** Clique no botão Iniciar. O cronômetro
    começará a contagem regressiva.\
3.  **Execução:** Mantenha o foco na tarefa até ouvir o sinal sonoro.\
4.  **Registro Automático:** Ao fim do tempo, o sistema contabiliza +1
    tarefa e soma o tempo ao total do dia.\
5.  **Ajustes Manuais:** Caso realize uma tarefa fora do cronômetro ou
    precise corrigir a contagem, utilize os botões de ajuste manual na
    parte inferior da interface.

## 📄 Licença

Este projeto é de código aberto e está sob a licença MIT.\
Foco na qualidade e na eficiência. 🎯
