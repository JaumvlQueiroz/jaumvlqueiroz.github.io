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
    const botoes = [...document.querySelectorAll("[data-versao]")];

    const REGIOES = [
      ["Centro-Oeste", 1030000], ["Nordeste", 8970000], ["Norte", 2490000], ["Sudeste", 5500000], ["Sul", 1320000]
    ];

    const VERSOES = {
      antes: {
        codigo: `output$grafico_pbf <- renderPlot({
  dados <- read.csv("programas.csv")
  dados <- dados[dados$programa == "PBF", ]
  x <- aggregate(dados$familias, by = list(dados$regiao), FUN = sum)
  barplot(x$x, names.arg = x$Group.1, col = rainbow(5))
})

output$grafico_cadunico <- renderPlot({
  dados <- read.csv("programas.csv")
  dados <- dados[dados$programa == "CADUNICO", ]
  x <- aggregate(dados$familias, by = list(dados$regiao), FUN = sum)
  barplot(x$x, names.arg = x$Group.1, col = rainbow(5))
})`,
        titulo: "Problemas desta versão",
        itens: [
          "O mesmo bloco de código se repete para cada programa. Uma correção precisa ser feita em vários lugares.",
          "O CSV é lido de novo toda vez que um gráfico é desenhado.",
          "Os nomes x e Group.1 não dizem o que guardam.",
          "No gráfico, cada barra tem uma cor sem significado, as regiões ficam em ordem alfabética e o eixo usa notação científica."
        ]
      },
      depois: {
        codigo: `library(dplyr)
library(ggplot2)

dados <- read.csv("programas.csv")

grafico_por_regiao <- function(dados, sigla) {
  dados |>
    filter(programa == sigla) |>
    group_by(regiao) |>
    summarise(familias = sum(familias)) |>
    ggplot(aes(x = reorder(regiao, familias), y = familias)) +
    geom_col(fill = "#0F62FE") +
    coord_flip() +
    scale_y_continuous(labels = scales::label_number(big.mark = ".", decimal.mark = ",")) +
    labs(x = NULL, y = "Famílias", title = paste(sigla, "por região"))
}

output$grafico_pbf <- renderPlot(grafico_por_regiao(dados, "PBF"))
output$grafico_cadunico <- renderPlot(grafico_por_regiao(dados, "CADUNICO"))`,
        titulo: "O que mudou",
        itens: [
          "O código repetido virou a função grafico_por_regiao, usada pelos dois gráficos.",
          "O CSV é lido uma vez só, quando o painel abre.",
          "Os nomes das variáveis dizem o que cada uma guarda.",
          "O gráfico tem uma cor só, barras ordenadas na horizontal, título e números com separador brasileiro."
        ]
      }
    };

    const svg = (conteudo, altura) => `<svg viewBox="0 0 400 ${altura}" role="img" aria-label="Famílias atendidas pelo Bolsa Família por região">${conteudo}</svg>`;

    const graficoAntes = () => {
      const cores = ["#FF0000", "#CCFF00", "#00FF66", "#0066FF", "#CC00FF"];
      const base = 220, topo = 16, esquerda = 48, max = 9000000;
      const escala = (v) => base - (v / max) * (base - topo);
      let partes = "";
      [0, 2e6, 4e6, 6e6, 8e6].forEach((v) => {
        const y = escala(v);
        partes += `<line class="r-eixo-linha" x1="${esquerda - 6}" x2="${esquerda}" y1="${y}" y2="${y}"/><text class="r-texto" x="${esquerda - 10}" y="${y + 4}" text-anchor="end">${v === 0 ? "0e+00" : (v / 1e6) + "e+06"}</text>`;
      });
      partes += `<line class="r-eixo-linha" x1="${esquerda}" x2="${esquerda}" y1="${escala(8e6)}" y2="${base}"/>`;
      const largura = 50, espaco = 14;
      REGIOES.forEach(([nome, valor], i) => {
        const x = esquerda + 14 + i * (largura + espaco);
        const y = escala(valor);
        partes += `<rect x="${x}" y="${y}" width="${largura}" height="${base - y}" fill="${cores[i]}" stroke="#000" stroke-width="1"><title>${nome}: ${fmt(valor)}</title></rect>`;
        partes += `<text class="r-texto pequeno" x="${x + largura / 2}" y="${base + 18}" text-anchor="middle">${nome}</text>`;
      });
      return svg(partes, 250);
    };

    const graficoDepois = () => {
      const ordenadas = [...REGIOES].sort((a, b) => b[1] - a[1]);
      const esquerda = 92, direita = 385, topo = 44, altura = 34, max = 9000000;
      const escala = (v) => esquerda + (v / max) * (direita - esquerda);
      const base = topo + ordenadas.length * altura;
      let partes = `<text class="r-titulo" x="0" y="20">PBF por região</text>`;
      [0, 2.5e6, 5e6, 7.5e6].forEach((v) => {
        const x = escala(v);
        partes += `<line class="grade" x1="${x}" x2="${x}" y1="${topo - 6}" y2="${base}"/><text class="r-texto" x="${x}" y="${base + 18}" text-anchor="middle">${fmt(v)}</text>`;
      });
      ordenadas.forEach(([nome, valor], i) => {
        const y = topo + i * altura + 6;
        partes += `<text class="r-texto" x="${esquerda - 10}" y="${y + 16}" text-anchor="end">${nome}</text>`;
        partes += `<rect class="r-barra" x="${esquerda}" y="${y}" width="${escala(valor) - esquerda}" height="${altura - 12}"><title>${nome}: ${fmt(valor)} famílias</title></rect>`;
      });
      partes += `<text class="r-texto" x="${(esquerda + direita) / 2}" y="${base + 40}" text-anchor="middle">Famílias</text>`;
      return svg(partes, base + 50);
    };

    const mostrar = (versao) => {
      const dados = VERSOES[versao];
      botoes.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.versao === versao)));
      codigo.innerHTML = colorir(dados.codigo, /(&lt;-|\|&gt;|\bfunction\b|\blibrary\b)/g);
      grafico.innerHTML = versao === "antes" ? graficoAntes() : graficoDepois();
      titulo.textContent = dados.titulo;
      mudancas.className = `r-mudancas ${versao}`;
      mudancas.innerHTML = dados.itens.map((t) => `<li>${escapar(t)}</li>`).join("");
    };

    botoes.forEach((b) => b.addEventListener("click", () => mostrar(b.dataset.versao)));
    mostrar("antes");
  };

  conferencia();
  limpezaR();
})();
