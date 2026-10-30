(() => {
  const escapar = (texto) => String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const embaralhar = (lista) => {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };
  const fmt = (n) => n.toLocaleString("pt-BR");

  const colorir = (codigo, palavras) => escapar(codigo).split("\n").map((linha) =>
    linha.split(/("[^"]*")/).map((parte, i) => i % 2
      ? `<span class="tk-s">${parte}</span>`
      : parte.replace(palavras, '<span class="tk-k">$1</span>')).join("")
  ).join("\n");

  const conferencia = () => {
    const tabOrigem = document.getElementById("tab-origem");
    if (!tabOrigem) return;
    const tabPublicado = document.getElementById("tab-publicado");
    const status = document.getElementById("conf-status");
    const lista = document.getElementById("divergencias");
    const btnConferir = document.getElementById("conferir");
    const btnOutro = document.getElementById("outro-caso");

    const MUNICIPIOS = [
      ["3550308", "São Paulo", "SP"], ["5208707", "Goiânia", "GO"], ["3106200", "Belo Horizonte", "MG"],
      ["1501402", "Belém", "PA"], ["2611606", "Recife", "PE"], ["2507507", "João Pessoa", "PB"],
      ["2704302", "Maceió", "AL"], ["2408102", "Natal", "RN"], ["4205407", "Florianópolis", "SC"],
      ["4106902", "Curitiba", "PR"], ["3304557", "Rio de Janeiro", "RJ"], ["2927408", "Salvador", "BA"],
      ["2304400", "Fortaleza", "CE"], ["2211001", "Teresina", "PI"], ["1302603", "Manaus", "AM"],
      ["5103403", "Cuiabá", "MT"], ["5300108", "Brasília", "DF"], ["1721000", "Palmas", "TO"],
      ["4314902", "Porto Alegre", "RS"], ["5002704", "Campo Grande", "MS"]
    ];

    const CODIGO = `import pandas as pd

origem = pd.read_excel("planilha_area.xlsx", dtype={"codigo_ibge": str})
publicado = pd.read_csv("visdata_publicado.csv", dtype={"codigo_ibge": str})

duplicados = publicado[publicado.duplicated("codigo_ibge", keep=False)]

comparacao = origem.merge(
    publicado.drop_duplicates("codigo_ibge"),
    on="codigo_ibge",
    how="outer",
    suffixes=("_origem", "_publicado"),
    indicator=True,
)

ausentes = comparacao[comparacao["_merge"] == "left_only"]
sobrando = comparacao[comparacao["_merge"] == "right_only"]

ambos = comparacao[comparacao["_merge"] == "both"]
divergentes = ambos[ambos["familias_origem"] != ambos["familias_publicado"]]`;
    document.getElementById("conf-codigo").innerHTML = colorir(CODIGO, /\b(import|as|True|False)\b/g);

    let origem = [];
    let publicado = [];
    let achados = [];

    const gerarCaso = () => {
      origem = embaralhar(MUNICIPIOS).slice(0, 7)
        .map(([codigo, municipio, uf]) => ({ codigo, municipio, uf, familias: 2000 + Math.floor(Math.random() * 380) * 1000 + Math.floor(Math.random() * 1000) }))
        .sort((a, b) => a.municipio.localeCompare(b.municipio, "pt-BR"));
      publicado = origem.map((l) => ({ ...l }));
      const posicoes = embaralhar(publicado.map((_, i) => i));
      const [a, b] = posicoes;
      [publicado[a].familias, publicado[b].familias] = [publicado[b].familias, publicado[a].familias];
      const extras = embaralhar(["ausente", "duplicado", "digitacao"]).slice(0, 2);
      let livres = posicoes.slice(2);
      if (extras.includes("digitacao")) {
        const alvo = publicado[livres.shift()];
        const texto = String(alvo.familias);
        const i = Math.floor(Math.random() * (texto.length - 1));
        const trocado = texto.slice(0, i) + texto[i + 1] + texto[i] + texto.slice(i + 2);
        alvo.familias = Number(trocado) === alvo.familias ? alvo.familias + 90 : Number(trocado);
      }
      if (extras.includes("duplicado")) {
        publicado.push({ ...publicado[livres.shift()] });
      }
      if (extras.includes("ausente")) {
        const sai = livres.shift();
        publicado = publicado.filter((_, i) => i !== sai);
      }
      achados = [];
      status.textContent = "Conferência pendente";
      status.className = "";
      lista.innerHTML = '<li class="vazio-lista">Compare as duas tabelas e clique em Conferir.</li>';
      btnConferir.disabled = false;
      desenhar();
    };

    const linhaHTML = (l, tabela, i) => {
      const marcas = achados.filter((a) => a[tabela] && a[tabela].includes(i));
      const classe = marcas.some((a) => a.selecionado) ? ' class="destacada"' : "";
      const problemaCodigo = marcas.some((a) => a.campo === "codigo") ? ' class="problema"' : "";
      const problemaValor = marcas.some((a) => a.campo === "familias") ? ' class="num problema"' : ' class="num"';
      return `<tr${classe}><td${problemaCodigo}>${l.codigo}</td><td>${escapar(l.municipio)}</td><td>${l.uf}</td><td${problemaValor}>${fmt(l.familias)}</td></tr>`;
    };

    const cabecalho = '<thead><tr><th>codigo_ibge</th><th>municipio</th><th>uf</th><th class="num">familias</th></tr></thead>';
    const desenhar = () => {
      tabOrigem.innerHTML = cabecalho + "<tbody>" + origem.map((l, i) => linhaHTML(l, "origem", i)).join("") + "</tbody>";
      tabPublicado.innerHTML = cabecalho + "<tbody>" + publicado.map((l, i) => linhaHTML(l, "publicado", i)).join("") + "</tbody>";
    };

    const conferir = () => {
      achados = [];
      const contagem = {};
      publicado.forEach((l) => { contagem[l.codigo] = (contagem[l.codigo] || 0) + 1; });
      Object.entries(contagem).filter(([, n]) => n > 1).forEach(([codigo, n]) => {
        const l = publicado.find((p) => p.codigo === codigo);
        achados.push({
          tipo: "Código IBGE duplicado",
          texto: `${l.municipio} (${codigo}) aparece ${n} vezes no arquivo publicado.`,
          publicado: publicado.map((p, i) => (p.codigo === codigo ? i : -1)).filter((i) => i >= 0),
          origem: [origem.findIndex((o) => o.codigo === codigo)],
          campo: "codigo"
        });
      });
      const primeiro = {};
      publicado.forEach((l, i) => { if (!(l.codigo in primeiro)) primeiro[l.codigo] = i; });
      origem.forEach((o, i) => {
        if (!(o.codigo in primeiro)) {
          achados.push({ tipo: "Município ausente", texto: `${o.municipio} (${o.codigo}) está na planilha, mas não entrou na carga.`, origem: [i], publicado: [], campo: "codigo" });
        }
      });
      const divergentes = origem.map((o, i) => ({ o, i, p: primeiro[o.codigo] }))
        .filter(({ o, p }) => p !== undefined && publicado[p].familias !== o.familias);
      const usados = new Set();
      divergentes.forEach((a) => {
        if (usados.has(a.i)) return;
        const par = divergentes.find((b) => b.i !== a.i && !usados.has(b.i)
          && publicado[a.p].familias === b.o.familias && publicado[b.p].familias === a.o.familias);
        if (par) {
          usados.add(a.i); usados.add(par.i);
          achados.push({
            tipo: "Valores trocados",
            texto: `Os valores de ${a.o.municipio} e ${par.o.municipio} foram publicados um no lugar do outro.`,
            origem: [a.i, par.i], publicado: [a.p, par.p], campo: "familias"
          });
        }
      });
      divergentes.filter((d) => !usados.has(d.i)).forEach((d) => {
        achados.push({
          tipo: "Valor diferente",
          texto: `${d.o.municipio}: a planilha tem ${fmt(d.o.familias)} famílias e o VIS DATA mostra ${fmt(publicado[d.p].familias)}.`,
          origem: [d.i], publicado: [d.p], campo: "familias"
        });
      });

      status.textContent = `${achados.length} divergências encontradas`;
      status.className = "alerta";
      lista.innerHTML = "";
      achados.forEach((achado, n) => {
        const item = document.createElement("li");
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "divergencia";
        botao.setAttribute("aria-pressed", "false");
        botao.innerHTML = `<strong>${achado.tipo}</strong><span>${escapar(achado.texto)}</span>`;
        botao.addEventListener("click", () => {
          achados.forEach((a, i) => { a.selecionado = i === n && !a.selecionado; });
          [...lista.querySelectorAll(".divergencia")].forEach((b, i) => b.setAttribute("aria-pressed", String(achados[i].selecionado)));
          desenhar();
        });
        item.appendChild(botao);
        lista.appendChild(item);
      });
      btnConferir.disabled = true;
      desenhar();
    };

    btnConferir.addEventListener("click", conferir);
    btnOutro.addEventListener("click", gerarCaso);
    gerarCaso();
  };

  const limpezaR = () => {
    const codigo = document.getElementById("r-codigo");
    if (!codigo) return;
    const grafico = document.getElementById("r-grafico");
    const mudancas = document.getElementById("r-mudancas");
    const titulo = document.getElementById("r-mudancas-titulo");
    const pendencias = document.getElementById("r-pendencias");
    const pendenciasTitulo = document.getElementById("r-pendencias-titulo");
    const arquivo = document.getElementById("r-arquivo");
    const lista = document.getElementById("r-passos");
    const anterior = document.getElementById("r-anterior");
    const proximo = document.getElementById("r-proximo");

    const REGIOES = [
      ["Centro-Oeste", 1030000], ["Nordeste", 8970000], ["Norte", 2490000], ["Sudeste", 5500000], ["Sul", 1320000]
    ];
    const TOTAL = REGIOES.reduce((s, [, v]) => s + v, 0);

    const PASSOS = [
      {
        nome: "Código original",
        codigo: `output$grafico_pbf <- renderPlot({
  dados <- read.csv("programas.csv")
  dados <- dados[dados$programa == "PBF", ]
  x <- aggregate(dados$familias, by = list(dados$regiao),
                 FUN = sum)
  barplot(x$x, names.arg = x$Group.1, col = rainbow(5))
})

output$grafico_cadunico <- renderPlot({
  dados <- read.csv("programas.csv")
  dados <- dados[dados$programa == "CADUNICO", ]
  x <- aggregate(dados$familias, by = list(dados$regiao),
                 FUN = sum)
  barplot(x$x, names.arg = x$Group.1, col = rainbow(5))
})`,
        mudou: [],
        falta: [
          "O mesmo bloco se repete para cada programa. Uma correção precisa ser feita em vários lugares.",
          "O CSV é lido de novo toda vez que um gráfico é desenhado.",
          "Os nomes x e Group.1 não dizem o que guardam.",
          "No gráfico, as cores do arco-íris não significam nada, as regiões estão em ordem alfabética e o eixo usa notação científica."
        ]
      },
      {
        nome: "Função reaproveitada",
        codigo: `dados <- read.csv("programas.csv")

grafico_por_regiao <- function(dados, sigla) {
  x <- aggregate(dados$familias[dados$programa == sigla],
                 by = list(dados$regiao[dados$programa == sigla]),
                 FUN = sum)
  barplot(x$x, names.arg = x$Group.1, col = rainbow(5))
}

output$grafico_pbf <- renderPlot(
  grafico_por_regiao(dados, "PBF")
)
output$grafico_cadunico <- renderPlot(
  grafico_por_regiao(dados, "CADUNICO")
)`,
        mudou: [
          "Os dois blocos viraram a função grafico_por_regiao. Uma correção agora vale para todos os gráficos.",
          "O CSV é lido uma vez só, quando o painel abre.",
          "O gráfico não mudou, e é de propósito: refatorar é melhorar o código sem alterar o resultado. Assim dá para conferir que nada quebrou."
        ],
        falta: [
          "Os nomes x e Group.1 continuam sem dizer o que guardam.",
          "O gráfico ainda tem os mesmos problemas."
        ]
      },
      {
        nome: "dplyr e ggplot",
        codigo: `library(dplyr)
library(ggplot2)

dados <- read.csv("programas.csv")

grafico_por_regiao <- function(dados, sigla) {
  resumo <- dados |>
    filter(programa == sigla) |>
    group_by(regiao) |>
    summarise(familias = sum(familias))

  ggplot(resumo, aes(familias, reorder(regiao, familias))) +
    geom_col(fill = "#0F62FE") +
    scale_x_continuous(
      labels = scales::label_number(big.mark = ".")
    )
}

output$grafico_pbf <- renderPlot(
  grafico_por_regiao(dados, "PBF")
)
output$grafico_cadunico <- renderPlot(
  grafico_por_regiao(dados, "CADUNICO")
)`,
        mudou: [
          "O código lê como uma sequência de passos: filtrar, agrupar, somar e desenhar. Os nomes resumo e familias dizem o que cada coisa guarda.",
          "Uma cor só. Cor em gráfico deve significar alguma coisa, e o arco-íris sugere categorias e ordem que não existem (Borland e Taylor, 2007).",
          "Barras ordenadas pelo valor. Comparar comprimentos alinhados a uma mesma base é uma das leituras mais precisas para o olho (Cleveland e McGill, 1984), e a ordem mostra o ranking sem esforço.",
          "Barras na horizontal, para os nomes das regiões caberem sem ficar tortos ou cortados.",
          "Números com separador brasileiro no lugar da notação científica."
        ],
        falta: [
          "Os títulos dos eixos saem automáticos, como reorder(regiao, familias).",
          "O gráfico não tem título, unidade nem fonte. Quem vê não sabe o que está olhando.",
          "O fundo cinza e a grade puxam mais atenção do que os dados."
        ]
      },
      {
        nome: "Gráfico com boas práticas",
        codigo: `library(dplyr)
library(ggplot2)

dados <- read.csv("programas.csv")

grafico_por_regiao <- function(dados, sigla, titulo) {
  resumo <- dados |>
    filter(programa == sigla) |>
    group_by(regiao) |>
    summarise(familias = sum(familias)) |>
    mutate(
      participacao = familias / sum(familias),
      milhoes = format(round(familias / 1e6, 2),
                       decimal.mark = ","),
      pct = round(100 * participacao),
      rotulo = paste0(milhoes, " mi (", pct, "%)")
    )

  ggplot(resumo, aes(familias, reorder(regiao, familias))) +
    geom_col(fill = "#0F62FE", width = 0.7) +
    geom_text(aes(label = rotulo), hjust = -0.1, size = 3.5) +
    scale_x_continuous(expand = expansion(mult = c(0, 0.35))) +
    labs(
      title = titulo,
      subtitle = "Número de famílias, junho de 2026",
      caption = "Fonte: MDS e Secom",
      x = NULL, y = NULL
    ) +
    theme_minimal(base_size = 12) +
    theme(
      axis.text.x = element_blank(),
      panel.grid = element_blank(),
      plot.title = element_text(face = "bold")
    )
}

output$grafico_pbf <- renderPlot(grafico_por_regiao(
  dados, "PBF", "Nordeste tem 46% das famílias do Bolsa Família"
))
output$grafico_cadunico <- renderPlot(grafico_por_regiao(
  dados, "CADUNICO", "Famílias no Cadastro Único por região"
))`,
        mudou: [
          "O título diz a conclusão, e não só o assunto. Quem passa o olho já sai sabendo o principal.",
          "Cada barra tem o valor e a participação escritos ao lado. Com os números na tela, o eixo e a grade deixam de ser necessários e saem, o que deixa só tinta que mostra dado (Tufte, 1983).",
          "As barras começam no zero. Em gráfico de barras, o comprimento é a informação, e cortar o eixo exagera as diferenças.",
          "Subtítulo com a unidade e o período, e a fonte dos dados no rodapé."
        ],
        falta: []
      }
    ];

    const svg = (conteudo, largura, altura) => `<svg viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Famílias atendidas pelo Bolsa Família por região">${conteudo}</svg>`;
    const fmt2 = (v) => (v / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const graficoBase = () => {
      const cores = ["#FF0000", "#CCFF00", "#00FF66", "#0066FF", "#CC00FF"];
      const base = 220, topo = 16, esquerda = 48, max = 9000000;
      const escala = (v) => base - (v / max) * (base - topo);
      let partes = "";
      [0, 2e6, 4e6, 6e6, 8e6].forEach((v) => {
        const y = escala(v);
        partes += `<line class="dev-linha" x1="${esquerda - 6}" x2="${esquerda}" y1="${y}" y2="${y}"/><text class="dev-texto" x="${esquerda - 10}" y="${y + 4}" text-anchor="end">${v === 0 ? "0e+00" : (v / 1e6) + "e+06"}</text>`;
      });
      partes += `<line class="dev-linha" x1="${esquerda}" x2="${esquerda}" y1="${escala(8e6)}" y2="${base}"/>`;
      REGIOES.forEach(([nome, valor], i) => {
        const x = esquerda + 14 + i * 64;
        const y = escala(valor);
        partes += `<rect x="${x}" y="${y}" width="50" height="${base - y}" fill="${cores[i]}" stroke="#000" stroke-width="1"><title>${nome}: ${fmt(valor)}</title></rect>`;
        partes += `<text class="dev-texto pequeno" x="${x + 25}" y="${base + 18}" text-anchor="middle">${nome}</text>`;
      });
      return svg(partes, 400, 250);
    };

    const graficoGgplot = () => {
      const ordenadas = [...REGIOES].sort((a, b) => b[1] - a[1]);
      const esquerda = 120, direita = 390, topo = 12, faixa = 40, max = 9000000 * 1.05;
      const escala = (v) => esquerda + (v / max) * (direita - esquerda);
      const base = topo + ordenadas.length * faixa;
      let partes = `<rect x="${esquerda}" y="${topo}" width="${direita - esquerda}" height="${base - topo}" fill="#EBEBEB"/>`;
      [1.25e6, 3.75e6, 6.25e6, 8.75e6].forEach((v) => {
        partes += `<line x1="${escala(v)}" x2="${escala(v)}" y1="${topo}" y2="${base}" stroke="#FFFFFF" stroke-width="0.6"/>`;
      });
      [0, 2.5e6, 5e6, 7.5e6].forEach((v) => {
        const x = escala(v);
        partes += `<line x1="${x}" x2="${x}" y1="${topo}" y2="${base}" stroke="#FFFFFF" stroke-width="1.2"/><text class="dev-texto cinza" x="${x}" y="${base + 15}" text-anchor="middle">${fmt(v)}</text>`;
      });
      ordenadas.forEach(([nome, valor], i) => {
        const centro = topo + i * faixa + faixa / 2;
        partes += `<line x1="${esquerda}" x2="${direita}" y1="${centro}" y2="${centro}" stroke="#FFFFFF" stroke-width="1.2"/>`;
        partes += `<rect x="${esquerda}" y="${centro - faixa * 0.45}" width="${escala(valor) - esquerda}" height="${faixa * 0.9}" fill="#0F62FE"><title>${nome}: ${fmt(valor)}</title></rect>`;
        partes += `<text class="dev-texto cinza" x="${esquerda - 6}" y="${centro + 4}" text-anchor="end">${nome}</text>`;
      });
      partes += `<text class="dev-texto" x="${(esquerda + direita) / 2}" y="${base + 34}" text-anchor="middle">familias</text>`;
      partes += `<text class="dev-texto" transform="translate(14 ${(topo + base) / 2}) rotate(-90)" text-anchor="middle">reorder(regiao, familias)</text>`;
      return svg(partes, 400, base + 44);
    };

    const graficoFinal = () => {
      const ordenadas = [...REGIOES].sort((a, b) => b[1] - a[1]);
      const esquerda = 90, direita = 296, topo = 62, faixa = 38, max = 8970000;
      const escala = (v) => esquerda + (v / max) * (direita - esquerda);
      const base = topo + ordenadas.length * faixa;
      let partes = `<text class="dev-titulo" x="6" y="22">Nordeste tem 46% das famílias do Bolsa Família</text>`;
      partes += `<text class="dev-texto cinza" x="6" y="42">Número de famílias, junho de 2026</text>`;
      ordenadas.forEach(([nome, valor], i) => {
        const centro = topo + i * faixa + faixa / 2;
        const pct = Math.round((100 * valor) / TOTAL);
        partes += `<text class="dev-texto cinza" x="${esquerda - 8}" y="${centro + 4}" text-anchor="end">${nome}</text>`;
        partes += `<rect class="dev-barra" x="${esquerda}" y="${centro - faixa * 0.35}" width="${escala(valor) - esquerda}" height="${faixa * 0.7}"><title>${nome}: ${fmt(valor)} famílias</title></rect>`;
        partes += `<text class="dev-texto" x="${escala(valor) + 6}" y="${centro + 4}">${fmt2(valor)} mi (${pct}%)</text>`;
      });
      partes += `<text class="dev-texto cinza pequeno" x="394" y="${base + 26}" text-anchor="end">Fonte: MDS e Secom</text>`;
      return svg(partes, 400, base + 36);
    };

    const GRAFICOS = [graficoBase, graficoBase, graficoGgplot, graficoFinal];

    PASSOS.forEach((passo, i) => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "passo-r";
      botao.innerHTML = `<span class="n" aria-hidden="true">${i + 1}</span>${passo.nome}`;
      botao.addEventListener("click", () => mostrar(i));
      lista.appendChild(botao);
    });

    let atual = 0;
    const mostrar = (indice) => {
      atual = indice;
      const passo = PASSOS[indice];
      [...lista.children].forEach((b, i) => {
        b.setAttribute("aria-pressed", String(i === indice));
        b.classList.toggle("visto", i < indice);
      });
      const anteriores = indice > 0 ? new Set(PASSOS[indice - 1].codigo.split("\n").map((l) => l.trim())) : null;
      codigo.innerHTML = passo.codigo.split("\n").map((linha) => {
        const html = colorir(linha, /(&lt;-|\|&gt;|\bfunction\b|\blibrary\b)/g);
        const nova = anteriores && linha.trim() && !anteriores.has(linha.trim());
        return `<span class="linha${nova ? " nova" : ""}">${html}</span>`;
      }).join("");
      arquivo.textContent = indice > 0 ? "modulo_programas.R · linhas novas em verde" : "modulo_programas.R";
      grafico.innerHTML = GRAFICOS[indice]();
      titulo.textContent = indice === 0 ? "Problemas desta versão" : "O que mudou neste passo";
      mudancas.className = `r-mudancas ${indice === 0 ? "antes" : "depois"}`;
      mudancas.innerHTML = (indice === 0 ? passo.falta : passo.mudou).map((t) => `<li>${escapar(t)}</li>`).join("");
      const restantes = indice === 0 ? [] : passo.falta;
      pendenciasTitulo.hidden = restantes.length === 0;
      pendencias.hidden = restantes.length === 0;
      pendencias.innerHTML = restantes.map((t) => `<li>${escapar(t)}</li>`).join("");
      anterior.disabled = indice === 0;
      proximo.disabled = indice === PASSOS.length - 1;
    };

    anterior.addEventListener("click", () => mostrar(Math.max(0, atual - 1)));
    proximo.addEventListener("click", () => mostrar(Math.min(PASSOS.length - 1, atual + 1)));
    mostrar(0);
  };

  conferencia();
  limpezaR();
})();
