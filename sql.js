const EXEMPLOS_SQL = [
 {
  "pergunta": "Que problemas os dados tinham?",
  "arquivo": "sql/05_qualidade.sql",
  "trecho": true,
  "tecnicas": "Subconsultas, DISTINCT, HAVING, NOT EXISTS",
  "sql": "INSERT INTO relatorio_qualidade (verificacao, ocorrencias, tratamento)\nSELECT\n    'Linhas repetidas na base de geolocalização',\n    (SELECT COUNT(*) FROM stg_geolocation)\n      - (SELECT COUNT(*) FROM (SELECT DISTINCT * FROM stg_geolocation)),\n    'Base agregada para uma linha por prefixo de CEP'\nUNION ALL\nSELECT\n    'Coordenadas fora do território brasileiro',\n    (SELECT COUNT(*) FROM stg_geolocation\n     WHERE NOT (CAST(geolocation_lat AS REAL) BETWEEN -33.8 AND 5.3\n            AND CAST(geolocation_lng AS REAL) BETWEEN -74.0 AND -34.7)),\n    'Descartadas no cálculo da coordenada média'\nUNION ALL\nSELECT\n    'Prefixos de CEP com mais de uma grafia de cidade',\n    (SELECT COUNT(*) FROM (\n        SELECT geolocation_zip_code_prefix\n        FROM stg_geolocation\n        GROUP BY geolocation_zip_code_prefix\n        HAVING COUNT(DISTINCT lower(trim(geolocation_city))) > 1)),\n    'Mantida a grafia mais frequente de cada prefixo'\nUNION ALL\n…",
  "colunas": [
   "verificacao",
   "ocorrencias",
   "tratamento"
  ],
  "linhas": [
   [
    "Linhas repetidas na base de geolocalização",
    261831,
    "Base agregada para uma linha por prefixo de CEP"
   ],
   [
    "Coordenadas fora do território brasileiro",
    42,
    "Descartadas no cálculo da coordenada média"
   ],
   [
    "Prefixos de CEP com mais de uma grafia de cidade",
    8555,
    "Mantida a grafia mais frequente de cada prefixo"
   ],
   [
    "Clientes com CEP sem geolocalização",
    279,
    "Mantidos; a geolocalização não é obrigatória"
   ],
   [
    "Mesmo review_id usado em mais de um pedido",
    789,
    "Chave primária composta (avaliacao_id, pedido_id)"
   ],
   [
    "Produtos sem categoria",
    610,
    "Categoria mantida nula"
   ],
   [
    "Categorias sem tradução para o inglês",
    2,
    "Cadastradas com nome em inglês nulo"
   ],
   [
    "Pedidos com status entregue e sem data de entrega",
    8,
    "Fora das análises de prazo de entrega"
   ],
   [
    "Pedidos sem nenhum item",
    775,
    "Fora das análises de faturamento"
   ],
   [
    "Pedidos sem registro de pagamento",
    1,
    "Mantidos e sinalizados"
   ],
   [
    "Pagamentos registrados com 0 parcelas",
    2,
    "Mantidos e sinalizados"
   ],
   [
    "Pedidos com valor pago diferente de produtos + frete (acima de R$ 1)",
    249,
    "Mantidos e sinalizados; o faturamento usa o valor dos itens"
   ]
  ],
  "destaque": [
   0
  ],
  "acao": "Cada problema tem um tratamento registrado. Assim, qualquer pessoa consegue saber por que um número ficou de fora de uma análise, em vez de descobrir a diferença depois.",
  "rotulo_acao": "Por que isso importa",
  "resposta": "Doze verificações automáticas rodam a cada execução e registram quantas vezes cada problema aparece e como ele foi tratado. A maior delas encontrou 261.831 linhas repetidas na base de geolocalização.",
  "link": "https://github.com/JaumvlQueiroz/ecommerce-sql-olist/blob/main/sql/05_qualidade.sql"
 },
 {
  "pergunta": "Como os dados foram tratados?",
  "arquivo": "sql/03_transformacao.sql",
  "trecho": true,
  "tecnicas": "CTE, ROW_NUMBER, filtro de coordenadas, agregação",
  "sql": "INSERT INTO geolocalizacao (cep_prefixo, latitude, longitude, cidade, uf)\nWITH validas AS (\n    SELECT\n        geolocation_zip_code_prefix AS cep_prefixo,\n        CAST(geolocation_lat AS REAL) AS latitude,\n        CAST(geolocation_lng AS REAL) AS longitude,\n        lower(trim(geolocation_city)) AS cidade,\n        upper(trim(geolocation_state)) AS uf\n    FROM stg_geolocation\n    WHERE CAST(geolocation_lat AS REAL) BETWEEN -33.8 AND 5.3\n      AND CAST(geolocation_lng AS REAL) BETWEEN -74.0 AND -34.7\n),\ngrafias AS (\n    SELECT\n        cep_prefixo,\n        cidade,\n        uf,\n        ROW_NUMBER() OVER (PARTITION BY cep_prefixo ORDER BY COUNT(*) DESC, cidade) AS ordem\n    FROM validas\n    GROUP BY cep_prefixo, cidade, uf\n),\ncoordenadas AS (\n    SELECT cep_prefixo, AVG(latitude) AS latitude, AVG(longitude) AS longitude\n    FROM validas\n    GROUP BY cep_prefixo\n)\nSELECT c.cep_prefixo, c.latitude, c.longitude, g.cidade, g.uf\nFROM coordenadas AS c\nJOIN grafias AS g ON g.cep_prefixo = c.cep_prefixo AND g.ordem = 1;",
  "colunas": [
   "etapa",
   "linhas"
  ],
  "linhas": [
   [
    "CSV original de geolocalização",
    1000163
   ],
   [
    "Sem as linhas repetidas",
    738332
   ],
   [
    "Uma linha por prefixo de CEP",
    19010
   ]
  ],
  "destaque": [
   2
  ],
  "acao": "Com várias linhas para o mesmo CEP, qualquer JOIN entre clientes e geolocalização multiplicaria os pedidos e inflaria o faturamento sem dar erro nenhum.",
  "rotulo_acao": "Por que isso importa",
  "resposta": "A base de geolocalização tinha várias linhas para o mesmo CEP, com grafias diferentes da cidade. Descartei as coordenadas fora do Brasil, mantive a grafia mais frequente de cada prefixo com ROW_NUMBER e calculei a coordenada média. A tabela caiu de 1.000.163 para 19.010 linhas.",
  "link": "https://github.com/JaumvlQueiroz/ecommerce-sql-olist/blob/main/sql/03_transformacao.sql"
 },
 {
  "pergunta": "Como o faturamento evoluiu mês a mês?",
  "arquivo": "consultas/02_faturamento_mensal.sql",
  "tecnicas": "CTE, LAG, janela nomeada",
  "sql": "WITH mensal AS (\n    SELECT mes, COUNT(*) AS pedidos, SUM(valor_produtos) AS faturamento\n    FROM vw_pedidos\n    WHERE conta_no_faturamento\n      AND mes BETWEEN '2017-01' AND '2018-08'\n    GROUP BY mes\n)\nSELECT\n    mes,\n    pedidos,\n    ROUND(faturamento, 2) AS faturamento,\n    ROUND(faturamento / pedidos, 2) AS ticket_medio,\n    ROUND(100.0 * (faturamento - LAG(faturamento) OVER janela) / LAG(faturamento) OVER janela, 1) AS variacao_pct\nFROM mensal\nWINDOW janela AS (ORDER BY mes)\nORDER BY mes;",
  "colunas": [
   "mes",
   "pedidos",
   "faturamento",
   "ticket_medio",
   "variacao_pct"
  ],
  "linhas": [
   [
    "2017-01",
    787,
    120098.27,
    152.6,
    null
   ],
   [
    "2017-02",
    1718,
    244959.35,
    142.58,
    104.0
   ],
   [
    "2017-03",
    2617,
    368341.32,
    140.75,
    50.4
   ],
   [
    "2017-04",
    2377,
    353842.98,
    148.86,
    -3.9
   ],
   [
    "2017-05",
    3640,
    503159.19,
    138.23,
    42.2
   ],
   [
    "2017-06",
    3205,
    429916.61,
    134.14,
    -14.6
   ],
   [
    "2017-07",
    3946,
    492287.3,
    124.76,
    14.5
   ],
   [
    "2017-08",
    4272,
    568245.79,
    133.02,
    15.4
   ],
   [
    "2017-09",
    4227,
    621415.91,
    147.01,
    9.4
   ],
   [
    "2017-10",
    4547,
    660179.62,
    145.19,
    6.2
   ],
   [
    "2017-11",
    7421,
    1003862.14,
    135.27,
    52.1
   ],
   [
    "2017-12",
    5618,
    742183.79,
    132.11,
    -26.1
   ],
   [
    "2018-01",
    7187,
    945456.29,
    131.55,
    27.4
   ],
   [
    "2018-02",
    6624,
    837895.43,
    126.49,
    -11.4
   ],
   [
    "2018-03",
    7168,
    981051.06,
    136.87,
    17.1
   ],
   [
    "2018-04",
    6919,
    993592.98,
    143.6,
    1.3
   ],
   [
    "2018-05",
    6833,
    992871.75,
    145.31,
    -0.1
   ],
   [
    "2018-06",
    6145,
    863265.53,
    140.48,
    -13.1
   ],
   [
    "2018-07",
    6233,
    878044.27,
    140.87,
    1.7
   ],
   [
    "2018-08",
    6421,
    848860.1,
    132.2,
    -3.3
   ]
  ],
  "destaque": [
   10
  ],
  "acao": "Planejar estoque, equipe e transportadoras com antecedência para novembro e acompanhar, durante o pico, se o prazo de entrega piora, já que atraso é o que mais derruba a nota do cliente.",
  "resposta": "Novembro de 2017, mês da Black Friday, teve o maior salto do período: o faturamento cresceu 52,1% em relação a outubro. A função LAG compara cada mês com o anterior.",
  "link": "https://github.com/JaumvlQueiroz/ecommerce-sql-olist/blob/main/consultas/02_faturamento_mensal.sql",
  "trecho": false,
  "rotulo_acao": "O que eu faria com isso"
 },
 {
  "pergunta": "O atraso na entrega derruba a nota do cliente?",
  "arquivo": "consultas/05_atraso_e_avaliacao.sql",
  "tecnicas": "Faixas com CASE, médias condicionais",
  "sql": "SELECT\n    CASE\n        WHEN dias_atraso <= -10 THEN '10 dias ou mais antes do prazo'\n        WHEN dias_atraso <= 0 THEN 'Até 9 dias antes ou no prazo'\n        WHEN dias_atraso <= 3 THEN '1 a 3 dias de atraso'\n        WHEN dias_atraso <= 7 THEN '4 a 7 dias de atraso'\n        WHEN dias_atraso <= 14 THEN '8 a 14 dias de atraso'\n        ELSE 'Mais de 14 dias de atraso'\n    END AS faixa,\n    COUNT(*) AS pedidos,\n    ROUND(AVG(nota), 2) AS nota_media,\n    ROUND(100.0 * AVG(nota <= 2), 1) AS notas_1_e_2_pct,\n    ROUND(100.0 * AVG(nota = 5), 1) AS notas_5_pct\nFROM vw_pedidos\nWHERE entregue AND nota IS NOT NULL\nGROUP BY faixa\nORDER BY MIN(dias_atraso);",
  "colunas": [
   "faixa",
   "pedidos",
   "nota_media",
   "notas_1_e_2_pct",
   "notas_5_pct"
  ],
  "linhas": [
   [
    "10 dias ou mais antes do prazo",
    61523,
    4.32,
    8.9,
    63.9
   ],
   [
    "Até 9 dias antes ou no prazo",
    27920,
    4.22,
    10.1,
    58.5
   ],
   [
    "1 a 3 dias de atraso",
    1852,
    3.29,
    32.2,
    33.2
   ],
   [
    "4 a 7 dias de atraso",
    1748,
    2.11,
    67.6,
    14.1
   ],
   [
    "8 a 14 dias de atraso",
    1446,
    1.67,
    80.1,
    6.8
   ],
   [
    "Mais de 14 dias de atraso",
    1335,
    1.73,
    78.2,
    7.2
   ]
  ],
  "destaque": [
   3
  ],
  "acao": "Avisar o cliente assim que um pedido tiver risco de atrasar e priorizar os pedidos que já passaram do prazo. A partir de 4 dias de atraso, a nota cai pela metade, então cada dia recuperado conta.",
  "resposta": "Sim. Com a entrega no prazo, a nota média passa de 4,2. Com 4 a 7 dias de atraso, cai para 2,11, e 68% das notas são 1 ou 2.",
  "link": "https://github.com/JaumvlQueiroz/ecommerce-sql-olist/blob/main/consultas/05_atraso_e_avaliacao.sql",
  "trecho": false,
  "rotulo_acao": "O que eu faria com isso"
 },
 {
  "pergunta": "Em quais estados a entrega demora mais?",
  "arquivo": "consultas/04_prazo_de_entrega_por_uf.sql",
  "tecnicas": "Agregação por estado sobre uma view",
  "sql": "SELECT\n    uf_cliente AS uf,\n    COUNT(*) AS pedidos_entregues,\n    ROUND(AVG(dias_entrega), 1) AS prazo_medio_dias,\n    ROUND(100.0 * AVG(dias_atraso > 0), 1) AS atrasados_pct\nFROM vw_pedidos\nWHERE entregue\nGROUP BY uf_cliente\nORDER BY prazo_medio_dias DESC;",
  "colunas": [
   "uf",
   "pedidos_entregues",
   "prazo_medio_dias",
   "atrasados_pct"
  ],
  "linhas": [
   [
    "RR",
    41,
    29.4,
    12.2
   ],
   [
    "AP",
    67,
    27.2,
    3.0
   ],
   [
    "AM",
    145,
    26.4,
    2.8
   ],
   [
    "AL",
    397,
    24.5,
    21.4
   ],
   [
    "PA",
    946,
    23.8,
    11.2
   ],
   [
    "MA",
    717,
    21.6,
    17.4
   ],
   [
    "SE",
    335,
    21.5,
    15.2
   ],
   [
    "CE",
    1279,
    21.3,
    13.8
   ],
   [
    "AC",
    80,
    21.0,
    3.8
   ],
   [
    "PB",
    517,
    20.4,
    10.4
   ],
   [
    "PI",
    476,
    19.5,
    13.9
   ],
   [
    "RO",
    243,
    19.4,
    2.9
   ],
   [
    "BA",
    3256,
    19.3,
    12.2
   ],
   [
    "RN",
    474,
    19.3,
    9.3
   ],
   [
    "PE",
    1593,
    18.4,
    9.6
   ],
   [
    "MT",
    886,
    18.1,
    6.0
   ],
   [
    "TO",
    274,
    17.7,
    9.9
   ],
   [
    "ES",
    1995,
    15.8,
    10.7
   ],
   [
    "GO",
    1957,
    15.6,
    6.5
   ],
   [
    "MS",
    701,
    15.6,
    9.7
   ],
   [
    "RJ",
    12350,
    15.3,
    12.1
   ],
   [
    "RS",
    5344,
    15.3,
    6.1
   ],
   [
    "SC",
    3546,
    15.0,
    8.2
   ],
   [
    "DF",
    2080,
    13.0,
    5.7
   ],
   [
    "MG",
    11354,
    12.0,
    4.6
   ],
   [
    "PR",
    4923,
    12.0,
    4.0
   ],
   [
    "SP",
    40494,
    8.8,
    4.5
   ]
  ],
  "destaque": [
   0,
   26
  ],
  "acao": "Rever a estimativa de prazo mostrada na compra para os estados do Norte e do Nordeste, para o cliente não receber uma promessa que não vai se cumprir, e avaliar transportadoras ou vendedores mais próximos dessas regiões.",
  "resposta": "No Norte. Em Roraima, a entrega leva 29,4 dias em média; em São Paulo, onde está a maior parte dos vendedores, 8,8 dias.",
  "link": "https://github.com/JaumvlQueiroz/ecommerce-sql-olist/blob/main/consultas/04_prazo_de_entrega_por_uf.sql",
  "trecho": false,
  "rotulo_acao": "O que eu faria com isso"
 },
 {
  "pergunta": "Quantos clientes voltam a comprar?",
  "arquivo": "consultas/06_recompra.sql",
  "tecnicas": "CTE, CASE, window function sobre agregação",
  "sql": "WITH compras AS (\n    SELECT cliente_unico_id, COUNT(*) AS pedidos\n    FROM vw_pedidos\n    WHERE conta_no_faturamento\n    GROUP BY cliente_unico_id\n)\nSELECT\n    CASE\n        WHEN pedidos = 1 THEN '1 pedido'\n        WHEN pedidos = 2 THEN '2 pedidos'\n        ELSE '3 pedidos ou mais'\n    END AS faixa,\n    COUNT(*) AS clientes,\n    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS clientes_pct\nFROM compras\nGROUP BY faixa\nORDER BY MIN(pedidos);",
  "colunas": [
   "faixa",
   "clientes",
   "clientes_pct"
  ],
  "linhas": [
   [
    "1 pedido",
    92096,
    96.96
   ],
   [
    "2 pedidos",
    2651,
    2.79
   ],
   [
    "3 pedidos ou mais",
    236,
    0.25
   ]
  ],
  "destaque": [
   0
  ],
  "resposta": "Quase nenhum: 97% dos clientes fizeram um único pedido no período.",
  "acao": "Conferi por categoria se isso era efeito de produtos de compra rara, como móveis. Não é: a recompra fica abaixo de 3,2% em todas as categorias com mais de mil clientes. Por isso eu testaria ações de segunda compra, como cupom e e-mail depois da entrega, comparando com um grupo que não recebe a ação.",
  "link": "https://github.com/JaumvlQueiroz/ecommerce-sql-olist/blob/main/consultas/06_recompra.sql",
  "trecho": false,
  "rotulo_acao": "O que eu faria com isso"
 },
 {
  "pergunta": "Quem são os 3 maiores vendedores de cada estado?",
  "arquivo": "consultas/07_top_vendedores_por_uf.sql",
  "tecnicas": "JOIN, CTE, RANK com PARTITION BY",
  "sql": "WITH por_vendedor AS (\n    SELECT\n        v.uf,\n        v.vendedor_id,\n        COUNT(DISTINCT i.pedido_id) AS pedidos,\n        SUM(i.preco) AS faturamento\n    FROM itens_pedido AS i\n    JOIN vendedores AS v ON v.vendedor_id = i.vendedor_id\n    JOIN pedidos AS p ON p.pedido_id = i.pedido_id\n    WHERE p.status NOT IN ('canceled', 'unavailable')\n    GROUP BY v.uf, v.vendedor_id\n),\nranking AS (\n    SELECT\n        *,\n        RANK() OVER (PARTITION BY uf ORDER BY faturamento DESC) AS posicao,\n        SUM(faturamento) OVER (PARTITION BY uf) AS faturamento_uf\n    FROM por_vendedor\n)\nSELECT\n    uf,\n    posicao,\n    vendedor_id,\n    pedidos,\n    ROUND(faturamento, 2) AS faturamento,\n    ROUND(100 * faturamento / faturamento_uf, 1) AS participacao_no_estado_pct\nFROM ranking\nWHERE posicao <= 3\nORDER BY faturamento_uf DESC, posicao;",
  "colunas": [
   "uf",
   "posicao",
   "vendedor_id",
   "pedidos",
   "faturamento",
   "participacao_no_estado_pct"
  ],
  "linhas": [
   [
    "SP",
    1,
    "4869f7a5…",
    1131,
    229237.63,
    2.6
   ],
   [
    "SP",
    2,
    "4a3ca931…",
    1804,
    200326.12,
    2.3
   ],
   [
    "SP",
    3,
    "fa1c13f2…",
    584,
    192842.13,
    2.2
   ],
   [
    "PR",
    1,
    "ccc4bbb5…",
    187,
    74004.62,
    5.9
   ],
   [
    "PR",
    2,
    "522620dc…",
    174,
    57168.49,
    4.5
   ],
   [
    "PR",
    3,
    "77530e97…",
    319,
    46470.5,
    3.7
   ],
   [
    "MG",
    1,
    "a1043baf…",
    715,
    101483.16,
    10.1
   ],
   [
    "MG",
    2,
    "25c5c91f…",
    158,
    54679.22,
    5.5
   ],
   [
    "MG",
    3,
    "7299e27e…",
    337,
    34225.43,
    3.4
   ],
   [
    "RJ",
    1,
    "46dc3b2c…",
    518,
    127161.22,
    15.2
   ],
   [
    "RJ",
    2,
    "620c87c1…",
    732,
    113659.4,
    13.6
   ],
   [
    "RJ",
    3,
    "edb1ef5e…",
    166,
    79284.55,
    9.5
   ],
   [
    "SC",
    1,
    "04308b1e…",
    94,
    60130.6,
    9.6
   ],
   [
    "SC",
    2,
    "eeb6de78…",
    83,
    43739.84,
    7.0
   ],
   [
    "SC",
    3,
    "712e6ed8…",
    79,
    39815.0,
    6.4
   ],
   [
    "RS",
    1,
    "87142160…",
    305,
    31095.98,
    8.2
   ],
   [
    "RS",
    2,
    "b32be169…",
    45,
    26874.0,
    7.1
   ],
   [
    "RS",
    3,
    "12b9676b…",
    134,
    26575.0,
    7.0
   ],
   [
    "BA",
    1,
    "53243585…",
    358,
    222776.05,
    78.1
   ],
   [
    "BA",
    2,
    "c72de06d…",
    21,
    17522.0,
    6.1
   ],
   [
    "BA",
    3,
    "75d34ebb…",
    61,
    14928.29,
    5.2
   ],
   [
    "DF",
    1,
    "44073f8b…",
    144,
    18729.64,
    19.3
   ],
   [
    "DF",
    2,
    "f3b80352…",
    87,
    10505.1,
    10.8
   ],
   [
    "DF",
    3,
    "3c487ae8…",
    30,
    9385.7,
    9.7
   ],
   [
    "PE",
    1,
    "de722cd6…",
    339,
    55426.1,
    60.6
   ],
   [
    "PE",
    2,
    "40db9e9a…",
    12,
    23168.0,
    25.3
   ],
   [
    "PE",
    3,
    "1d0997ff…",
    3,
    3747.0,
    4.1
   ],
   [
    "GO",
    1,
    "9d5a9018…",
    67,
    10292.31,
    15.5
   ],
   [
    "GO",
    2,
    "750303a2…",
    54,
    8085.0,
    12.2
   ],
   [
    "GO",
    3,
    "b410bdd3…",
    44,
    7726.9,
    11.7
   ],
   [
    "ES",
    1,
    "001cca7a…",
    200,
    25080.03,
    52.7
   ],
   [
    "ES",
    2,
    "33dd941c…",
    5,
    6787.5,
    14.3
   ],
   [
    "ES",
    3,
    "15aac934…",
    25,
    4353.9,
    9.1
   ],
   [
    "MA",
    1,
    "06a2c3af…",
    392,
    36408.95,
    100.0
   ],
   [
    "CE",
    1,
    "bbf9ad41…",
    14,
    7846.0,
    38.9
   ],
   [
    "CE",
    2,
    "dbdd0ec7…",
    16,
    6384.0,
    31.6
   ],
   [
    "CE",
    3,
    "8d79c8a0…",
    27,
    2777.72,
    13.8
   ],
   [
    "PB",
    1,
    "a6bd7d1c…",
    16,
    14368.61,
    84.1
   ],
   [
    "PB",
    2,
    "07017df3…",
    8,
    946.49,
    5.5
   ],
   [
    "PB",
    3,
    "fd435faa…",
    1,
    749.0,
    4.4
   ],
   [
    "MT",
    1,
    "2dee2ce6…",
    54,
    7784.5,
    45.6
   ],
   [
    "MT",
    2,
    "abcd2cb3…",
    45,
    4880.22,
    28.6
   ],
   [
    "MT",
    3,
    "99002261…",
    36,
    4088.0,
    23.9
   ],
   [
    "RN",
    1,
    "02d35243…",
    14,
    5794.0,
    58.0
   ],
   [
    "RN",
    2,
    "52562a9f…",
    14,
    3266.6,
    32.7
   ],
   [
    "RN",
    3,
    "41c2bad7…",
    20,
    782.0,
    7.8
   ],
   [
    "MS",
    1,
    "b1fecf4d…",
    19,
    3669.64,
    42.9
   ],
   [
    "MS",
    2,
    "9c068d10…",
    17,
    2658.9,
    31.1
   ],
   [
    "MS",
    3,
    "7df1fc11…",
    5,
    1037.6,
    12.1
   ],
   [
    "RO",
    1,
    "3364a91e…",
    6,
    3579.94,
    75.2
   ],
   [
    "RO",
    2,
    "a5259c14…",
    8,
    1182.26,
    24.8
   ],
   [
    "PI",
    1,
    "47efca56…",
    12,
    2522.0,
    100.0
   ],
   [
    "SE",
    1,
    "4b39558c…",
    4,
    1096.7,
    68.3
   ],
   [
    "SE",
    2,
    "c53bcd3b…",
    5,
    509.5,
    31.7
   ],
   [
    "PA",
    1,
    "67225bff…",
    8,
    1238.0,
    100.0
   ],
   [
    "AM",
    1,
    "327b89b8…",
    3,
    1177.0,
    100.0
   ],
   [
    "AC",
    1,
    "4be2e7f9…",
    1,
    267.0,
    100.0
   ]
  ],
  "destaque": [
   0,
   1,
   2
  ],
  "acao": "Usar o ranking para escolher, em cada estado, com quais vendedores fazer ações regionais, como frete promocional. Em São Paulo, como nenhum vendedor passa de 2,6%, a saída de um deles quase não muda o faturamento do estado.",
  "resposta": "O RANK com PARTITION BY monta um ranking separado para cada estado. Em São Paulo, o maior mercado, nem o primeiro colocado passa de 2,6% do faturamento do estado.",
  "link": "https://github.com/JaumvlQueiroz/ecommerce-sql-olist/blob/main/consultas/07_top_vendedores_por_uf.sql",
  "trecho": false,
  "rotulo_acao": "O que eu faria com isso"
 },
 {
  "pergunta": "Quantos vendedores fazem a maior parte do faturamento?",
  "arquivo": "consultas/08_concentracao_de_vendedores.sql",
  "tecnicas": "ROW_NUMBER, soma acumulada (Pareto)",
  "sql": "WITH por_vendedor AS (\n    SELECT i.vendedor_id, SUM(i.preco) AS faturamento\n    FROM itens_pedido AS i\n    JOIN pedidos AS p ON p.pedido_id = i.pedido_id\n    WHERE p.status NOT IN ('canceled', 'unavailable')\n    GROUP BY i.vendedor_id\n),\nacumulado AS (\n    SELECT\n        ROW_NUMBER() OVER (ORDER BY faturamento DESC) AS posicao,\n        SUM(faturamento) OVER (ORDER BY faturamento DESC ROWS UNBOUNDED PRECEDING)\n            / SUM(faturamento) OVER () AS fatia_acumulada\n    FROM por_vendedor\n)\nSELECT\n    COUNT(*) AS vendedores,\n    MIN(CASE WHEN fatia_acumulada >= 0.5 THEN posicao END) AS vendedores_para_50pct,\n    MIN(CASE WHEN fatia_acumulada >= 0.8 THEN posicao END) AS vendedores_para_80pct,\n    ROUND(100.0 * MIN(CASE WHEN fatia_acumulada >= 0.8 THEN posicao END) / COUNT(*), 1) AS vendedores_para_80pct_do_total\nFROM acumulado;",
  "colunas": [
   "vendedores",
   "vendedores_para_50pct",
   "vendedores_para_80pct",
   "vendedores_para_80pct_do_total"
  ],
  "linhas": [
   [
    3053,
    129,
    540,
    17.7
   ]
  ],
  "destaque": [
   0
  ],
  "acao": "Acompanhar de perto os 540 vendedores que fazem 80% do faturamento, com alertas de atraso e de queda nas vendas, porque um problema com eles afeta quase toda a receita.",
  "resposta": "Poucos: 540 dos 3.053 vendedores (17,7%) somam 80% do faturamento, e 129 já respondem pela metade.",
  "link": "https://github.com/JaumvlQueiroz/ecommerce-sql-olist/blob/main/consultas/08_concentracao_de_vendedores.sql",
  "trecho": false,
  "rotulo_acao": "O que eu faria com isso"
 }
];

(() => {
  const lista = document.getElementById("perguntas-sql");
  if (!lista) return;
  const resposta = document.getElementById("sql-resposta");
  const tabela = document.getElementById("sql-tabela");
  const total = document.getElementById("sql-total");
  const codigo = document.getElementById("sql-codigo");
  const arquivo = document.getElementById("sql-arquivo");
  const tecnicas = document.getElementById("sql-tecnicas");
  const acao = document.getElementById("sql-acao");
  const acaoRotulo = document.getElementById("sql-acao-rotulo");

  const PALAVRAS = /\b(WITH|AS|SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|JOIN|ON|GROUP|BY|ORDER|HAVING|LIMIT|CASE|WHEN|THEN|ELSE|END|DESC|ASC|DISTINCT|UNION|ALL|INSERT|INTO|OVER|PARTITION|WINDOW|ROWS|UNBOUNDED|PRECEDING|BETWEEN|EXISTS|CAST|REAL|COUNT|SUM|AVG|MIN|MAX|ROUND|LAG|RANK|ROW_NUMBER)\b/g;

  const escapar = (texto) => texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const colorir = (sql) => escapar(sql).split("\n").map((linha) => {
    const partes = linha.split(/('(?:[^']|'')*')/);
    return partes.map((parte, i) => i % 2
      ? `<span class="tk-s">${parte}</span>`
      : parte.replace(PALAVRAS, '<span class="tk-k">$1</span>')).join("");
  }).join("\n");

  const formatar = (valor) => {
    if (valor === null) return "";
    if (typeof valor !== "number") return valor;
    return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  };

  const montarTabela = (exemplo) => {
    const numericas = exemplo.colunas.map((_, i) => exemplo.linhas.every((l) => l[i] === null || typeof l[i] === "number"));
    const cabecalho = exemplo.colunas.map((c, i) => `<th${numericas[i] ? ' class="num"' : ""}>${escapar(c)}</th>`).join("");
    const corpo = exemplo.linhas.map((linha, n) => {
      const celulas = linha.map((v, i) => `<td${numericas[i] ? ' class="num"' : ""}>${escapar(String(formatar(v)))}</td>`).join("");
      return `<tr${exemplo.destaque.includes(n) ? ' class="destacada"' : ""}>${celulas}</tr>`;
    }).join("");
    tabela.innerHTML = `<thead><tr>${cabecalho}</tr></thead><tbody>${corpo}</tbody>`;
  };

  const mostrar = (indice) => {
    const exemplo = EXEMPLOS_SQL[indice];
    [...lista.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === indice)));
    resposta.textContent = exemplo.resposta;
    acaoRotulo.textContent = exemplo.rotulo_acao;
    acao.textContent = exemplo.acao;
    montarTabela(exemplo);
    const n = exemplo.linhas.length;
    total.textContent = `${n} ${n === 1 ? "linha" : "linhas"}`;
    codigo.innerHTML = colorir(exemplo.sql);
    arquivo.textContent = exemplo.trecho ? `Trecho de ${exemplo.arquivo}` : exemplo.arquivo;
    arquivo.href = exemplo.link;
    tecnicas.textContent = exemplo.tecnicas;
    tabela.parentElement.scrollTop = 0;
    const primeira = tabela.querySelector("tr.destacada");
    if (primeira && primeira.offsetTop > tabela.parentElement.clientHeight - 40) {
      tabela.parentElement.scrollTop = primeira.offsetTop - 60;
    }
  };

  EXEMPLOS_SQL.forEach((exemplo, i) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "pergunta-sql";
    botao.innerHTML = `<span class="n" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>${escapar(exemplo.pergunta)}`;
    botao.addEventListener("click", () => mostrar(i));
    lista.appendChild(botao);
  });

  mostrar(0);
})();
