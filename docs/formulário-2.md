# Formulário II (Fase III)

## 1. Qual foi o relacionamento N:N escolhido e quais tabelas ele conecta?

Existem dois relacionamentos N:N no sistema:

1. `order-product`: Pedido-Produto
2. `product-drawing`: Produto-Desenho

## 2. Qual estrutura de índice foi utilizada (B+ ou Hash Extensível)? Justifique a escolha.

Para montar os relacionamentos, as chaves primárias foram indexadas da seguinte forma:

- Número do Pedido (`orders.number`): Árvore B+ porque o campo é uma string de tamanho variável.
- Id do Produto (`product.id`): Hash Extensível porque o campo é um inteiro.
- Número do Desenho (`drawing.number`): Árvore B+ porque o campo é uma string de tamanho variável.

## 3. Como foi implementada a chave composta da tabela intermediária?

Por uma questão de praticidade, ao invés de utilizar uma chave composta, a chave primária das tabelas intermédiarias foram implementadas utilizando um identificador único e incremental (serial).

Para manter um bom desempenho do relacionamento, foi adicionado índices em cada chave estrangeira do relacionamento.

## 4. Como é feita a busca eficiente de registros por meio do índice?

Quando um registro é pesquisado por algum campo que esteja indexado, então é utilizado o índice que guarda o par de chave-endereço do arquivo de cada registro. Deste modo, quando uma chave é encontrada no índice, então é retornado o seu endereço, o qual é utilizado para recuperar os dados do mesmo.

Nos relacionamentos N:N, é utilizado o índice da chave estrangeira da tabela intermediária para recuperar os registros da tabela desejada.

## 5. Como o sistema trata a integridade referencial (remoção/atualização) entre as tabelas?

O sistema trata cada relacionamento de uma forma diferente, essas relações foram feitas nos arquivos de CRUD, que podem ser encontrados na pasta: [/src/actions/](/src/actions/).

- `RESTRICT`: Casos que não é permitido a atualização ou exclusão. Um exemplo é ao tentar excluir um produto que está incluso em algum pedido. O sistema mostra um aviso indicando que não é possível fazer essa operação.

- `CASCADE`: Casos em que a operação é propagada. Um exemplo é ao excluir um pedido, neste caso, todos os itens daquele pedido também serão excluídos.

- `NO ACTION`: Casos em que a operação não altera o outro lado. Um exemplo é ao excluir um produto, seus desenhos não serão excluídos ou alterados.

## 6. Como foi organizada a persistência dos dados dessa nova tabela (mesmo padrão de cabeçalho e lápide)?

Os registros de todas as tabelas se comportão da mesma maneira, quando um dado é invalidado, então o primeiro byte do seu endereço será marcado como `F`, o que indica que ele é inválido. Ao tentar ler um registro marcado como inválido, o sistema trata como se ele não existisse.

## 7. Descreva como o código da tabela intermediária se integra com o CRUD das tabelas principais.

1. [Produto:Pedido](/src/actions/order-item.ts)

Ao criar um pedido, é necessário indicar quais produtos serão inclusos, então para cada item, será chamada a função `createOrderItem` da tabela intermediária.

Ao recuperar um pedido, também é utilizado a função `getOrderItems` para recuperar todos os items daquele pedido, que chama a função `getProductData` para recuperar o produto daquele item (Cada item está associado com um produto).

Ao atualizar um pedido, é necessário verificar quais itens foram modificados, quais foram criados, e quais foram excluídos. Para cada uma dessas verificações é utilizada as funções `updateOrderItem`, `createOrderItem` e `deleteOrderItem` respectivamente.

Ao excluir um pedido, será chamada a função `deleteAllOrderItems` que irá excluir todos os itens daquele pedido.

Ao excluir um produto, é utilizada a função `getProductOrders` para recuperar todos os pedidos que incluem aquele produto. Caso ela retorne algum resultado, então a operação é abortada.

2. [Produto:Desenho](/src/actions/product-drawing.ts)

Ao criar um produto, é necessário criar o desenho e seu relacionamento, ou somente o relacionamento com algum desenho já existente. Para isso, é utilizado as funções `createDrawing` e `createProductDrawing`.

Ao recuperar um produto, é utilizado a função `getProductDrawings` para também recuperar todos os desenhos daquele produto.

Ao atualizar um produto, é pode ser necessário criar desenhos novos relacionamentos novos ou excluir relacionamentos já existentes. Para isso são utilizadas as funções `createDrawing`, `createProductDrawing` e `removeProductDrawing` respectivamente.

Ao excluir um produto, é utilizado a função `removeAllProductDrawings` para remover todos os relacionamentos de desenhos com aquele produto.

## 8. Descreva como está organizada a estrutura de diretórios e módulos no repositório após esta fase.

A estrutura dos diretórios se manteve quase idêntica, o que mudou foi que antes, todos os esquemas das tabelas estavam em um mesmo arquivo. Agora eles foram quebrados para cada tabela em seu arquivo na pasta [/src/schemas/](/src/schemas/).

Também foi adicionado os arquivos de CRUD das tabelas novas, eles podem ser encontrados na pasta [/src/actions/](/src/actions/).

A estrutura geral do projeto pode ser encontrada no arquivo: [README.md](/README.md#estrutura-do-projeto).

Não houve grandes mudanças nos módulos utilizados, mas alguns foram adicionados para os componentes do _front-end_.
