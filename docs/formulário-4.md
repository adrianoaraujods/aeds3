# Formulário IV (Fase V)

## 1. Qual campo textual foi escolhido para aplicar os algoritmos de casamento de padrões? Por quê?

O campo escolhido foi o Código de Produtos `order.code`, isso porque os produtos são a parte central do sistema.

## 2. Explique o funcionamento do KMP implementado.

A implementação foi feita através de uma classe (disponível no arquivo: [`kpm.ts`](/src/lib/kpm.ts)) que em seu construtor, já faz os pré-processamentos no padrão a ser pesquisado. E também existe um método público `search` que retorna os índices das posições iniciais em que o padrão foi encontrado. Caso nenhum padrão seja encontrado, é retornado um _array_ vazio.

## 3. Explique o funcionamento do Boyer–Moore implementado.

A implementação foi feita da mesma forma que o algoritmo KMP, e está disponível no arquivo: [`kpm.ts`](/src/lib/kpm.ts). Cada pré-processamento foi separado em um método privado que é utilizado no construtor.

## 4. Descreva como integrou os algoritmos ao sistema.

Como os dois algoritmos foram feitos utilizando a mesma abordagem, eles são utilizados da mesma forma. Primeiro, o algoritmo é instanciado com o padrão a ser pesquisado. Depois um laço é criado para percorrer todos os produtos, e dentro desse laço, é pesquisado se o código do produto contém o padrão. Cada pedido que tiver algum padrão é separado em um _array_, que por sua vez será utilizado para mostrar os resultados na tela.

## 5. Quais dificuldades encontrou na implementação dos dois algoritmos?

A maior dificuldade foi de criar e utilizar as tabelas (_arrays_) geradas pelos pré-processamentos, pricipalmente pelo algoritmo Boyer-Moore que possuí um fluxo muito mais complexo para decidir qual tabela utilizar.
