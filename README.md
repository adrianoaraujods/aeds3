# Trabalho Prático de AEDS III

## Membros

- [Adriano Araújo Domingos dos Santos](https://github.com/adrianoaraujods)

## Instruções de uso

Você precisa ter o [Node.js](https://nodejs.org/) e o [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) instalado em sua máquina.

Depois você precisa instalar as dependências com o seguinte comando:

```bash
npm install
```

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

Ou caso deseje, você pode gerar e rodar a versão otimizada:

```bash
npm run build && npm run start
```

## Estrutura do Projeto

```
📁 data/                        %% Pasta com os registros e os índices
📁 docs/                        %% Pasta com os artefatos da documentação
📁 src/                         %% Pasta com o código fonte
├── 📁 actions/                 %% Pasta com Server Actions
│   ├── 📄 backup.ts            %% Funções para gerenciar os backups comprimidos
│   ├── 📄 client.ts            %% CRUD Clientes
│   ├── 📄 drawing.ts           %% CRUD Desenhos
│   ├── 📄 keys.ts              %% Funções para gerenciar as chaves do algoritmo RLA
│   ├── 📄 order-item.ts        %% CRUD Itens Pedido
│   ├── 📄 order.ts             %% CRUD Pedido
│   ├── 📄 product-drawing.ts   %% CRUD Tabela intermediária, Produtos-Desenhos
│   ├── 📄 product.ts           %% CRUD Produtos
│   └── 📄 record-file.ts       %% Implementação genérica para salvar os registros
│
├── 📁 app/          %% Pasta das rotas
├── 📁 components/   %% Pasta dos componentes
├── 📁 hooks/        %% Pasta para React Hooks
│
├── 📁 lib/                     %% Pasta para bibliotecas e configurações
│   ├── 📄 boyer-moore.ts       %% Implementação do algoritmo Boyer-Moore
│   ├── 📄 bp-tree.ts           %% Implementação da Árvore B+
│   ├── 📄 buffer.ts            %% Implementação das funções de serialização
│   ├── 📄 extendable-hash.ts   %% Implementação do Hash Extensível
│   ├── 📄 huffman.ts           %% Implementação do algoritmo Huffman
│   ├── 📄 kpm.ts               %% Implementação do algoritmo KPM
│   ├── 📄 lzw.ts               %% Implementação do algoritmo LZW
│   └── 📄 rsa.ts               %% Implementação do algoritmo RLA
│
├── 📁 schemas/   %% Pasta com as definições dos registros
├── 📁 styles/    %% Pasta com todos os arquivos CSS
└── 📁 tests/     %% Pasta com os scripts de testes e criação de dados simulados
```

## Descrição de Minimundo

O sistema da Lafaiete gerencia o processo comercial da empresa que se inicia com os clientes, que são identificados por seu CNPJ e possuem uma razão social, endereço, telefone, email, condições de pagamento e uma sigla. O endereço é o local onde o material é recebido, e ele é composto por país, estado, cidade, bairro, logradouro, número e complemento. A condição de pagamento é o número de dias para um depósito em conta a partir do faturamento do material.

Um produto possui um código, descrição, unidade de medida e desenhos. Um desenho é composto por seu número único e uma URL que aponta para seu arquivo.

Um cliente pode fazer vários pedidos de compra, e cada pedido deve estar associado a exatamente um cliente. Um pedido é identificado por seu número único e possui a data de criação, a situação (se já foi entregue por completo, se está no prazo, se esta atrasado ou se foi cancelado) e o valor total. Cada pedido pode ter vários produtos, e deve ser identificado por um número (na maioria das vezes sequencial), ter uma quantidade, preço unitário, data de entrega e a situação do item (se já foi entregue por completo, se está no prazo, se esta atrasado ou se foi cancelado). Cada produto pode estar em vários pedidos.

### Diagrama Entidade-Relacionamento

![](/docs/der.svg)

### Diagrama de Casos de Uso

![](/docs/dcu.svg)

## Entregas

- [Formulário 1 (Fase II)](/docs/formulário-1.md)
- [Formulário 2 (Fase III)](/docs/formulário-2.md)
- [Formulário 3 (Fase IV)](/docs/formulário-3.md)
- [Formulário 4 (Fase V)](/docs/formulário-4.md)
