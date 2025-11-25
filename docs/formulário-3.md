# Formulário III (Fase IV)

Os algoritmos de compressão foram utilizados para criar backups dos dados do sistema.

Para criar os backups, basta clicar no botão de configuração (ícone de engrenagem) e utilizar o submenu "Backup".

Ao testar os backups, delete os arquivos com a aplicação desligada para evitar erros.

## 1. Qual foi a taxa de compressão obtida com o algoritmo de Huffman?

Ao criar um "backup" pelo sistema, os cálculos estão sendo apresentados pelo terminal.

### Caso de teste 1 (Huffman).

O caso de teste a seguir mostra um arquivo com 10 clientes e 2000 produtos e um pedido.

- **a. Tamanho do arquivo original:** 97.865b (96kb)
- **b. Tamanho do arquivo comprimido:** 63.383b (62kb)
- **c. Cálculo da taxa:** $1 - \frac{63.383}{97.865} = 0.3523 = 35.23\%$
- **d. Interpretação do resultado:** Em casos em que existem dados salvos significativos, o algoritmo apresenta uma boa taxa de compressão, criando uma cópia dos arquivos originais de dados com cerca de um $^1⁄_3$ a menos que o tamanho total.

### Caso de teste 2 (Huffman).

O caso de teste a seguir mostra um arquivo com 10 clientes e 1 produtos e um pedido.

- **a. Tamanho do arquivo original:** 2.079b (2kb)
- **b. Tamanho do arquivo comprimido:** 2.276b (2kb)
- **c. Cálculo da taxa:** $1 - \frac{2276}{2079} = −0,0947 = -9.48\%$
- **d. Interpretação do resultado:** Em casos em que há poucos dados, o algoritmo acaba aumentando o tamanho total da cópia em cerca de 10%, o que pode ser explicado pelo tamanho do dicionário de cada arquivo que também deve ser armazenado.

## 2. Qual foi a taxa de compressão obtida com o algoritmo de LZW?

### Caso de teste 1 (LZW).

O caso de teste a seguir mostra um arquivo com 10 clientes e 2000 produtos e um pedido.

- **a. Tamanho do arquivo original:** 97.865b (96kb)
- **b. Tamanho do arquivo comprimido:** 26.876b (26kb)
- **c. Cálculo da taxa:** $1 - \frac{26.876}{97.865} = 0.7254 = 72.54\%$
- **d. Interpretação do resultado:** A compressão em casos em que existem mais dados é muito boa, deixando o arquivo final com um tamanho de cerca de $^1/_4$ do tamanho original. Também é notável que foi bem melhor do que o Huffman neste cenário. Uma das causas pode ser por conta de muitos padrões repetidos que os campos criados foram semelhantes em cada produto, mudando apenas o número.

### Caso de teste 2 (LZW).

O caso de teste a seguir mostra um arquivo com 10 clientes e 1 produtos e um pedido.

- **a. Tamanho do arquivo original:** 2.079b (2kb)
- **b. Tamanho do arquivo comprimido:** 2.374b (2kb)
- **c. Cálculo da taxa:** $1 - \frac{2.374}{2.079} = -0.1419 = -14.19\%$
- **d. Interpretação do resultado:** Nos casos em que há poucos dados, o LZW acabou sendo pior ainda do que o Huffman, mas ainda como essa eficiência é baixa apenas quando há pouco dados, isso acaba tendo pouco impacto. O ganho de eficiência em arquivos maiores acaba sendo muito mais vantajosa.

## 3. Quais dificuldades surgiram ao implementar Huffman e LZW e como você resolveu?

A maior dificuldade foi usar o algoritmo Huffman em dados binários ao invés de strings. A solução foi estipular que cada 8bits seriam um símbolo, mas isso também acabou gerando algumas complicações que foram solucionadas utilizando um _padding_ para garantir que cada símbolo tenha exatamente 8bits.

O LZW não foi muito complicado por já ter tratado os problemas no Huffman, que envolvia utilizar bits ao invés de strings.

## 4. Justifique a escolha da estrutura de dados usada para armazenar as tabelas, dicionários e árvores utilizados pelos algoritmos.

O algoritmo Huffman salva um _header_ com a seguinte estrutura: 2 bytes representando o número de símbolos, e para cada símbolo, 1 byte representando o símbolo, e mais 4 bytes para representar a frequência. Dado essa estrutura, é possível remontar a árvore e conseguir os códigos de cada símbolo, e por fim substituir cada ocorrência. Essa escolha foi feita visando diminuir o tamanho do arquivo comprimido, mesmo que gaste mais recursos computacionais para recriar a árvore.

O algoritmo LZW não requer o armazenamento de nenhuma estrutura secundária, apenas os próprios dados comprimidos. A tabela utilizada foi uma tabela Hash (`Map`) em memória principal, tanto durante a compressão, quando na descompressão dos dados.

## 5. Qual campo foi escolhido para criptografia? Por quê?

Nesse sistema, todos os dados seriam igualmente sensíveis. Por isso, foi escolhido o campo "Preço" de item de pedido (`order-item`) apenas para demonstar a funcionalidade e o algoritmo.

## 6. Descreva como o RSA foi implementado no projeto.

A implementação do algoritmo RSA, juntamente com a criação das chaves, pode ser encontrada no arquivo: [rsa.ts](/src/lib/rsa.ts)

- **a. Estrutura das chaves pública e privada:** As chaves são constituídas de dois `BigInt` seguindo a seguinte estrutura:

```ts
type PublicKey = { e: bigint; n: bigint };
type PrivateKey = { d: bigint; n: bigint };
```

- **b. Como e onde foram armazenadas:** Elas são geradas automáticamente na primeira vez que o aplicativo é aberto. O arquivo [keys.ts](/src/actions/keys.ts) é responsável por armazenar as chaves, que são salvas no arquivo [.env](/.env) como uma 3 strings distintas.
- **c. Como foram carregadas pelo sistema:** Elas são carregadas como variáveis de ambiente utilizando a sintaxe: `process.env["label"]`. O arquivo [keys.ts](/src/actions/keys.ts) também é responsável por recuperá-las.
- **d. Tamanho das chaves escolhidas e justificativa:** Cada chave e composta de dois primos com 512 bits, portanto 1024 bits no total. Esse tamanho foi escolhido devido a velocidade de criação das mesmas, o tempo necessário para gerar esses primos é quase instantâneo, mas ainda assim é desejável que seja o maior possível.
- **e. Em qual momento a criptografia do(s) campo(s) ocorre (no CRUD).:** A criptografia acontece depois da validação dos formulários mas logo antes de serializar os dados para serem salvos. Apenas nas operações de "Create" e "Update" que é necessário criptografar o campo. Toda essa lógica está contida no arquivo [order.ts](/src/actions/order.ts).
- **f. Em qual momento ocorre a descriptografia:** A descriptografia acontece depois de recuperar os dados e antes de retornar o valor nas funções de "Read". Toda essa lógica está contida no arquivo [order.ts](/src/actions/order-item.ts).
- **g. Conversões realizadas (ex.: string $\to$ bytes $\to$ blocos):** Foi necessário várias conversões para o algoritmo e também para o armazenamento e recuperação correta dos dados. As conversões foram:
  - **String(UTF-8) $\to$ BigInt:** durante a encriptação.
  - **BigInt $\to$ String(Hex):** para armazenar do valor encriptado.
  - **String(Hex) $\to$ BigInt:** após recuperar o valor armazenado.
  - **BigInt $\to$ String(UTF-8):** durante a desencriptação.
  - **String(UTF-8) $\to$ Number:** para transformar no valor final (preço de item de pedido).

Essas conversões estão nos arquivos: [rsa.ts](/src/lib/rsa.ts) e [buffer.ts](/src/lib/buffer.ts)
