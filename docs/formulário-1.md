# Formulário I (Fase II)

## a) Qual a estrutura usada para representar os registros?

As definições das estruturas dos registros podem ser encontradas na pasta: [/src/schemas/](/src/schemas/). Cada registro é serializado de acordo com essa definição, e esse processo ocorre no arquivo: [buffer.ts](/src/lib/buffer.ts).

Cada tipo de dado é representado da seguinte forma:

- **`string`:** Dois bytes são utilizados para indicar o tamanho da string, e depois cada caractere é guardado em 1 byte utilizando o _charset_ UTF-8. Se a string tiver um tamanho máximo definido, ela não irá salvar seu tamanho e irá alocar os bytes igual o máximo.
- **`boolean`:** Um byte salva `T` para `true` e `F` para `false` utilizando o _charset_ UTF-8.
- **`int`:** São utilizados 4 bytes para salvar cada número, aceitando números positivos e negativos.
- **`number`:** São utilizados 4 bytes para salvar cada número, aceitando números positivos e negativos. Para permitir números fracionários, todo número é salvo como seu produto por 100, o que permite uma precisão de duas casas decimais.
- **`bigint`:** São utilizados 2 bytes para indicar quantos bytes irão ocupar, e mais $n$ bytes transformados em uma string hexadecimal para para salvar o número.
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

Os índices em chaves primárias e campos únicos que são inteiros ou strings com tamanho fixo, são indexados utilizando Hash Extensível, implementado no arquivo: [extendable-hash.ts](/src/lib/extendable-hash.ts). Os demais campos indexados foram salvos utilizando Árvores B+, sua implementação pode ser encontrada no arquivo: [bp-tree.ts](/src/lib/bp-tree.ts).

- `clients.document`: Hash Extensível
- `clients.email`: Árvore B+
- `clients.id`: Hash Extensível
- `clients.name`: Árvore B+
- `clients.registration`: Hash Extensível
- `clients.socialName`: Árvore B+
- `clients.number`: Árvore B+

- `order-item.id`: Hash Extensível
- `order-item.orderNumber`: Árvore B+
- `order-item.productId`: Árvore B+
- `order-item.number`: Árvore B+

- `order.numbrt`: Árvore B+

- `product-drawings.id`: Hash Extensível
- `product-drawings.drawingNumber`: Árvore B+
- `product-drawings.productId`: Árvore B+

- `product.id`: Hash Extensível

## f) Como foi implementado o relacionamento 1:N (explique a lógica da navegação entre registros e integridade referencial)?

A implementação dos relacionamentos 1:N consistem em uma propriedade no objeto do lado 1 que guarda um _array_ de números, cada um desses números são a chave primária do objeto do lado N.

Deste modo, para acessar os registros do lado N, basta utilizar o índice da chave primária para encontrar cada um.

O único relacionamento 1:N é Cliente-Pedido, nesse caso, não é permitido excluir um Cliente (`client`) que tenha Pedidos (`order`). Essa lógica está disponível na função: [`deleteClient`](/src/actions/client.ts).

## g) Como os índices são persistidos em disco? (formato, atualização, sincronização com os dados).

Os índices de Hash Extensível são armazenas em _Buckets_, eles possuem a seguinte estrutura:

```ts
type Pair<T> = { key: T; value: number };

type Bucket<T> = {
  localDepth: number; // 1 byte
  pairs: Pair<TKey>[]; // quantidade de pares * (b bytes da chave + 4 bytes)
};
```

A quantidade de pares é calculada usando a seguinte fórmula:

$$
\text{Quantidade de Pares} = \Bigg\lfloor \dfrac
  {\text{Tamanho do Bloco} - \text{Tamanho do Header}}
  {\text{Tamanho do Par}}
\Bigg\rfloor
$$

Se sobrarem bytes não utilizados no bloco, eles serão escritos como `0`.

Apesar de não haver necessidade, no _Header_ também é utilizado 2 bytes para indicar a quantidade de chaves no Bucket. Nos casos de uso, eles seriam inutilizados de qualquer forma.

Cada par é salvo como $n$ bytes para a chave e 4 bytes para o _offset_ do registro no arquivo de dados.

Quando o valor de um registro que está indexado é atualizado, então o Bucket inteiro onde ele está localizado será sobrescrito com o _offset_ atualizado.

## h) Como está estruturado o projeto no GitHub (pastas, módulos, arquitetura)?

O projeto foi feito utilizando o [Next.js](https://nextjs.org) como _framework_, juntamente com [TypeScript](https://www.typescriptlang.org) e [Zod](https://zod.dev) para garantir _type safety_ e [Tailwind CSS](https://tailwindcss.com) para a estilização.

A estrutura das pastas pode ser encontrada no arquivo: [README.md](/README.md#estrutura-do-projeto).
