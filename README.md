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

## Descrição de Minimundo

O sistema da Lafaiete gerencia o processo comercial da empresa que se inicia com os clientes, que são identificados por seu CNPJ e possuem uma razão social, endereço, telefone, email, condições de pagamento e uma sigla. O endereço é o local onde o material é recebido, e ele é composto por país, estado, cidade, bairro, logradouro, número e complemento. A condição de pagamento é o número de dias para um depósito em conta a partir do faturamento do material.

Um produto possui um código, descrição, unidade de medida e desenhos. Um desenho é composto por seu número único e uma URL que aponta para seu arquivo.

Um cliente pode fazer vários pedidos de compra, e cada pedido deve estar associado a exatamente um cliente. Um pedido é identificado por seu número único e possui a data de criação, a situação (se já foi entregue por completo, se está no prazo, se esta atrasado ou se foi cancelado) e o valor total. Cada pedido pode ter vários produtos, e deve ser identificado por um número (na maioria das vezes sequencial), ter uma quantidade, preço unitário, data de entrega e a situação do item (se já foi entregue por completo, se está no prazo, se esta atrasado ou se foi cancelado). Cada produto pode estar em vários pedidos.

### Diagrama Entidade-Relacionamento

![](/docs/der.svg)

### Diagrama de Casos de Uso

![](/docs/dcu.svg)

## Entregas

### Formulário (Fase II)

#### a) Qual a estrutura usada para representar os registros?

As definições das estruturas dos registros podem ser encontradas no arquivo: [schemas.ts](/src/lib/schemas.ts). Cada registro é serializado de acordo com essa definição, e esse processo ocorre no arquivo: [files.ts](/src/lib/files.ts).

Cada tipo de dado é representado da seguinte forma:

- **`string`:** Dois bytes são utilizados para indicar o tamanho da string, e depois cada caractere é guardado em 1 byte utilizando o _charset_ UTF-8.
- **`boolean`:** Um byte salva `T` para `true` e `F` para `false` utilizando o _charset_ UTF-8.
- **`int`:** São utilizados 4 bytes para salvar cada número, aceitando números positivos e negativos.
- **`number`:** São utilizados 4 bytes para salvar cada número, aceitando números positivos e negativos. Para permitir números fracionários, todo número é salvo como seu produto por 100, o que permite uma precisão de duas casas decimais.
- **`bigint`:** São utilizados 8 bytes para salvar cada número, aceitando números positivos e negativos.
- **`date`:** São convertidas para milissegundos seguindo o padrão Epoch Time e guardados em 4 bytes.
- **`array`:** Dois bytes são utilizados para indicar quantos elementos, e depois cada dado é serializado de acordo com o seu tipo.
- **`object`:** São serializado seguindo a ordem de definição e cada valor do objeto é serializado de forma recursiva.
- **`enum`:** Um byte é utilizado para indicar qual índice utilizado para recuperar o valor de acordo com a ordem de definição.

> **Observação:** os "tipos primitivos" podem ser salvos como `undefined`, para isso, cada tipo utiliza um valor de sentinela.

#### b) Como atributos multivalorados do tipo string foram tratados?

Todos os atributos multivalorados foram tratados da mesma forma. As _strings_ em específico são tratadas da seguinte forma:

- 2 bytes para guardar a quantidade de _strings_.
- Para cada _string_:
  - 2 bytes para guardar a quantidade de caracteres.
  - 1 byte para cada caractere utilizando o _charset_ UTF-8.

#### c) Como foi implementada a exclusão lógica?

Todos os registros estão indexados pelo menos pela chave primária, então se eles não puderem ser encontrados no índice, quer dizer que esse valor já não é mais válido.

Todas as chaves primárias são um identificador único incremental partindo de 1. Isso foi feito para facilitar a manter integridade referencial, porque em alguns casos será possível alterar o campo que normalmente seria a chave primária.

#### d) Além das PKs, quais outras chaves foram utilizadas nesta etapa?

Foram utilizadas apenas as chaves primarias exportadas como chaves estrangeiras para indicarem os relacionamentos entre os registros.

Adicionalmente foram adicionados índices dos campos únicos de cada registro para facilitar as operações de inclusão e atualização.

#### e) Quais tipos de estruturas (hash, B+ Tree, extensível, etc.) foram utilizadas para cada chave de pesquisa?

Todos os índices foram construídos utilizando uma árvore B+, sua implementação pode ser encontrada no arquivo: [bp-tree.ts](/src/lib/bp-tree.ts).

#### f) Como foi implementado o relacionamento 1:N (explique a lógica da navegação entre registros e integridade referencial)?

A implementação dos relacionamentos 1:N consistem em uma propriedade no objeto do lado 1 que guarda um _array_ de números, cada um desses números são a chave primária do objeto do lado N.

Deste modo, para acessar os registros do lado N, basta utilizar o índice da chave primária para encontrar cada um.

Normalmente não é permitido a exclusão de um registro que está sendo referenciado, o único caso que isso é permitido é quando um item de pedido é removido. Neste caso, é utilizado a propriedade `orderId` para atualizar os itens do pedido fazendo o uso do índice da chave primária de pedidos.

#### g) Como os índices são persistidos em disco? (formato, atualização, sincronização com os dados).

Os índices são armazenas em nós da árvore B+, eles possuem a seguinte estrutura:

```ts
type Node<T> = {
  isLeaf: boolean; // 1 byte
  keys: T[]; // 2 bytes para indicar o tamanho + x * n bytes
  pointers: number[]; // 2 bytes para indicar o tamanho + 4 * n bytes
  nextLeafOffset: number; // 4 bytes
};
```

Quando eles são salvos em disco, é adicionado 2 bytes no início para indicar o tamanho (em bytes) daquele nó. O conteúdo de cada nó é serializado utilizando a mesma função que é utilizada para os registros.

Ao salvar um novo nó em disco, ele é anexado no seu fim, isso faz com que o arquivo fique fragmentado. Eventualmente será implementado uma função para desfragmentar o arquivo, ela será utilizada principalmente quando o arquivo for ser compactado.

Quando o valor de um registro que está indexado é atualizado, então o nó é sobrescrito na mesma posição já que seu tamanho não irá mudar.

#### h) Como está estruturado o projeto no GitHub (pastas, módulos, arquitetura)?

O projeto foi feito utilizando o [Next.js](https://nextjs.org) como _framework_, juntamente com [TypeScript](https://www.typescriptlang.org) e [Zod](https://zod.dev) para garantir _type safety_ e [Tailwind CSS](https://tailwindcss.com) para a estilização.

A estruturas das pastas segue a seguinte disposição:

```
📁 data/                    %% Pasta com os registros e os índices
📁 docs/                    %% Pasta com os artefatos da documentação
📁 src/                     %% Pasta com o código fonte
├── 📁 actions/             %% Pasta com Server Actions
│   ├── 📄 file.ts          %% Implementação dos arquivos binários
│   ├── 📄 client.ts        %% CRUD Clientes
│   ├── 📄 drawing.ts       %% CRUD Desenhos
│   ├── 📄 order-item.ts    %% CRUD Itens Pedido
│   ├── 📄 order.ts         %% CRUD Pedido
│   └── 📄 product.ts       %% CRUD Produtos
│
├── 📁 app/                 %% Pasta das rotas
├── 📁 components/          %% Pasta dos componentes
├── 📁 hooks/               %% Pasta para React Hooks
├── 📁 lib/                 %% Pasta para bibliotecas e configurações
│   ├── 📄 bp-tree.ts       %% Implementação da árvore B+
│   ├── 📄 files.ts         %% Implementação da funções de (de)serialização
│   └── 📄 schemas.ts       %% Definições dos registros
│
└── 📁 styles/              %% Pasta com todos os arquivos CSS

📄 README.md                %% Esse arquivo
```
