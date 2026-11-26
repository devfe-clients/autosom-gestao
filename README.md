# Auto Som -  gestão

Criar o sistema de gestão Adriano Auto Som (Dayane Cristina Barbosa Santana - CNPJ 41.899.218/0001-07, Praia Grande/SP), baseado na arquitetura e nas funcionalidades do projeto do Jairo (ideal-jairo-main.zip) e no contrato anexado (Contrato_Adriano_Auto_Som.pdf).

Diretrizes arquiteturais e técnicas:
- Não utilizar Lovable Cloud nem Supabase.
- Construir com foco no ecossistema Firebase (Firebase Auth, Cloud Firestore, Firestore Rules) e hospedagem na Vercel, mantendo também o adapter local para desenvolvimento.
- Toda validação de regras de negócio, dados e consistência deve ser garantida no backend / Firestore rules / schemas (nunca confiar exclusivamente no frontend).
- As chaves de conexão do Firebase devem ser configuradas via variáveis de ambiente (.env.example / .env.local).

Funcionalidades e módulos principais:
1. Módulos base do Jairo adaptados para som automotivo e acessórios:
   - Ordens de Serviço (OS) com checklist de entrada e saída.
   - Orçamentos.
   - Estoque de peças e equipamentos.
   - Compras de peças com fornecedores.
   - Financeiro (Contas a pagar e a receber, fluxo de caixa).
   - Clientes e Veículos.
   - Gestão de Usuários (com perfis separados para os funcionários e para a dona).
   - Painel (Dashboard) geral.

2. Módulo de Código de Barras e Estoque:
   - Cadastro de código de barras / EAN para cada peça/acessório.
   - Bipar entrada de peças: leitor físico ou scanner incrementa a quantidade automaticamente no estoque.
   - Bipar saída na OS ou venda: debita automaticamente do estoque.
   - Compatibilidade plug-and-play com leitores de código de barras USB/sem fio (emulação de teclado com Enter automático).
   - Leitor via câmera do celular/tablet para operações móveis.
   - Gerador e impressão de etiquetas com código de barras para itens sem código de fábrica.

3. PDV / Venda Rápida de Balcão:
   - Tela ágil para venda direta de peças e acessórios avulsos no balcão sem a obrigatoriedade de abrir uma OS vinculada a veículo/placa, com cálculo automático, escolha da forma de pagamento e baixa imediata no estoque.

4. Auditoria e Relatórios em Tempo Real:
   - Registro automático e detalhado de todas as ações executadas por cada funcionário (quem criou, quem alterou, quem deu baixa em estoque, quem registrou pagamento) com carimbo de data e hora.
   - Painel de relatórios e feed de atividades em tempo real, permitindo que a proprietária Dayane acompanhe toda a operação remotamente com total transparência.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ea9bfdae-0adc-4775-9c7c-0b5ef3c8fc0f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
