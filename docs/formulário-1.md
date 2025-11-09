# Formulário I (Fase II)

## a) Qual a estrutura usada para representar os registros?

As definições das estruturas dos registros podem ser encontradas na pasta: [/src/schemas/](/src/schemas/). Cada registro é serializado de acordo com essa definição, e esse processo ocorre no arquivo: [buffer.ts](/src/lib/buffer.ts).

Cada tipo de dado é representado da seguinte forma:

- **`string`:** Dois bytes são utilizados para indicar o tamanho da string, e depois cada caractere é guardado em 1 byte utilizando o _charset_ UTF-8. Se a string tiver um tamanho máximo definido, ela não irá salvar seu tamanho e irá alocar os bytes igual o máximo.
- **`boolean`:** Um byte salva `T` para `true` e `F` para `false` utilizando o _charset_ UTF-8.
- **`int`:** São utilizados 4 bytes para salvar cada número, aceitando números positivos e negativos.
- **`number`:** São utilizados 4 bytes para salvar cada número, aceitando números positivos e negativos. Para permitir números fracionários, todo número é salvo como seu produto por 100, o que permite uma precisão de duas casas decimais.
- **`bigint`:** São utilizados 8 bytes para salvar cada número, aceitando números positivos e negativos.
- **`date`:** São convertidas para milissegundos seguindo o padrão Epoch Time e guardados em 8 bytes.
- **`array`:** Dois bytes são utilizados para indicar quantos elementos, e depois cada dado é serializado de acordo com o seu tipo.
- **`object`:** São serializado seguindo a ordem de definição e cada valor do objeto é serializado de forma recursiva.
- **`enum`:** Um byte é utilizado para indicar qual índice utilizado para recuperar o valor de acordo com a ordem de definição.

> **Observação:** os "tipos primitivos" podem ser salvos como `undefined`, para isso, cada tipo utiliza um valor de sentinela.

## b) Como atributos multivalorados do tipo string foram tratados?

Todos os atributos multivalorados (_arrays_) foram tratados da mesma forma. As _strings_ em específico são tratadas da seguinte forma:

- 2 bytes para guardar a quantidade de _strings_.
- Para cada _string_:
  - 2 bytes para guardar a quantidade de caracteres.
  - 1 byte para cada caractere utilizando o _charset_ UTF-8.

## c) Como foi implementada a exclusão lógica?

O primeiro byte de cada registro é salvo como um valor booleano seguindo o padrão estipulado no arquivo: [buffer.ts](/src/lib/buffer.ts). Esse byte representa se o registro está válido (`T`) ou não (`F`).

Quando um arquivo é marcado como inválido, suas chaves são excluídas de todos os índices.

## d) Além das PKs, quais outras chaves foram utilizadas nesta etapa?

Foram utilizadas apenas as chaves primarias exportadas como chaves estrangeiras para indicarem os relacionamentos entre os registros.

Adicionalmente foram adicionados índices dos campos únicos de cada registro para facilitar as operações de inclusão e atualização.

## e) Quais tipos de estruturas (hash, B+ Tree, extensível, etc.) foram utilizadas para cada chave de pesquisa?

Todos os índices foram construídos utilizando uma árvore B+, sua implementação pode ser encontrada no arquivo: [bp-tree.ts](/src/lib/bp-tree.ts).

## f) Como foi implementado o relacionamento 1:N (explique a lógica da navegação entre registros e integridade referencial)?

A implementação dos relacionamentos 1:N consistem em uma propriedade no objeto do lado 1 que guarda um _array_ de números, cada um desses números são a chave primária do objeto do lado N.

Deste modo, para acessar os registros do lado N, basta utilizar o índice da chave primária para encontrar cada um.

Normalmente não é permitido a exclusão de um registro que está sendo referenciado, o único caso que isso é permitido é quando um item de pedido é removido. Neste caso, é utilizado a propriedade `orderNumber` para atualizar os itens do pedido fazendo o uso do índice da chave primária de pedidos.

Um exemplo do caso que não é permitido, é ao tentar excluir um produto que está presente em algum item de pedido. Neste caso, o sistema irá mostrar um erro indicando que essa operação não é permitida. Para isso, é verificado na tabela `order-item` pelo campo `productId`, caso retorne algum valor, então quer dizer que existe algum pedido com esse produto.

## g) Como os índices são persistidos em disco? (formato, atualização, sincronização com os dados).

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

## h) Como está estruturado o projeto no GitHub (pastas, módulos, arquitetura)?

O projeto foi feito utilizando o [Next.js](https://nextjs.org) como _framework_, juntamente com [TypeScript](https://www.typescriptlang.org) e [Zod](https://zod.dev) para garantir _type safety_ e [Tailwind CSS](https://tailwindcss.com) para a estilização.

A estruturas das pastas pode ser encontrada no arquivo: [README.md](../README.md#estrutura-do-projeto)
