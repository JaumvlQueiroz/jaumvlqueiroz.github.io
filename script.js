(() => {
  const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (n, casas) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

  const raiz = document.documentElement;
  const SOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const LUA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const btnTema = document.getElementById("tema");
  const temaEscuroDoSistema = matchMedia("(prefers-color-scheme: dark)");
  const temaAtual = () => raiz.getAttribute("data-theme") || (temaEscuroDoSistema.matches ? "dark" : "light");
  const aoMudarTema = [];
  const mostrarTema = () => {
    const escuro = temaAtual() === "dark";
    btnTema.innerHTML = escuro ? SOL : LUA;
    btnTema.setAttribute("aria-label", escuro ? "Usar tema claro" : "Usar tema escuro");
    aoMudarTema.forEach((funcao) => funcao());
  };
  btnTema.addEventListener("click", () => {
    const novo = temaAtual() === "dark" ? "light" : "dark";
    raiz.setAttribute("data-theme", novo);
    try { localStorage.setItem("tema", novo); } catch (e) {}
    mostrarTema();
  });
  temaEscuroDoSistema.addEventListener("change", mostrarTema);

  const aviso = document.getElementById("aviso");
  let tempoAviso;
  const avisar = (texto) => {
    aviso.textContent = texto;
    aviso.classList.add("visivel");
    clearTimeout(tempoAviso);
    tempoAviso = setTimeout(() => aviso.classList.remove("visivel"), 2200);
  };

  const linksMenu = [...document.querySelectorAll(".menu a")];
  const observarMenu = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      linksMenu.forEach((a) => a.classList.toggle("ativo", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  linksMenu.forEach((a) => {
    const alvo = document.querySelector(a.getAttribute("href"));
    if (alvo) observarMenu.observe(alvo);
  });

  const contar = (el) => {
    const alvo = Number(el.dataset.contar);
    const sufixo = el.dataset.sufixo || "";
    if (reduzido) { el.textContent = alvo + sufixo; return; }
    const inicio = performance.now();
    const passo = (agora) => {
      const p = Math.min((agora - inicio) / 1400, 1);
      el.textContent = Math.round(alvo * (1 - Math.pow(1 - p, 3))) + sufixo;
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  };
  const observarNumeros = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => { if (e.isIntersecting) { contar(e.target); observarNumeros.unobserve(e.target); } });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-contar]").forEach((el) => observarNumeros.observe(el));

  const canvas = document.getElementById("fluxo");
  const ctx = canvas.getContext("2d");
  const ROTULOS = ["Excel", "pandas", "Validação", "CSV", "VIS DATA"];
  const lerCor = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  const lerCores = () => ({ linha: lerCor("--canvas-linha"), no: lerCor("--surface"), bruto: lerCor("--canvas-bruto"), ok: lerCor("--green"), ruim: lerCor("--flag"), tinta: lerCor("--ink") });
  let COR = lerCores();
  const retidosEl = document.getElementById("retidos");
  let largura = 0, altura = 0, pontos = [], retidos = 0, acumulado = 0, rodando = false, anterior = 0;

  const medir = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    largura = r.width; altura = r.height;
  };
  const posicoes = () => {
    const margem = 38;
    return ROTULOS.map((_, i) => margem + i * (largura - 2 * margem) / (ROTULOS.length - 1));
  };
  const novoPonto = () => ({ x: -6, faixa: Math.random() * 2 - 1, ruim: Math.random() < 0.22, estado: "fluindo", queda: 0, vy: 0, alfa: 1, r: 3 + Math.random() * 1.5 });
  const atualizar = (dt) => {
    const xs = posicoes();
    const velocidade = Math.max(55, largura * 0.15);
    acumulado += dt;
    if (acumulado > 0.15) { acumulado = 0; pontos.push(novoPonto()); }
    for (const p of pontos) {
      if (p.estado === "fluindo") {
        p.x += velocidade * dt;
        if (p.ruim && p.x >= xs[2] - 14) {
          p.x = xs[2] - 14; p.estado = "retido"; retidos++;
          retidosEl.textContent = retidos;
        }
      } else {
        p.vy += 240 * dt; p.queda += p.vy * dt; p.alfa -= 1.1 * dt;
      }
    }
    pontos = pontos.filter((p) => p.alfa > 0 && p.x < xs[4]);
  };
  const desenhar = () => {
    ctx.clearRect(0, 0, largura, altura);
    const xs = posicoes();
    const yc = altura * 0.4;
    const espalhar = Math.min(50, altura * 0.21);
    ctx.strokeStyle = COR.linha; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, yc); ctx.lineTo(largura, yc); ctx.stroke();
    for (const p of pontos) {
      let fator = 1;
      if (p.x > xs[3]) fator = Math.max(0, 1 - (p.x - xs[3]) / ((xs[4] - xs[3]) * 0.75));
      const y = yc + p.faixa * espalhar * fator + p.queda;
      ctx.globalAlpha = Math.max(0, p.alfa);
      ctx.fillStyle = p.x > xs[1] ? (p.ruim ? COR.ruim : COR.ok) : COR.bruto;
      ctx.beginPath(); ctx.arc(p.x, y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = `600 ${largura < 440 ? 11 : 13}px "Manrope", system-ui, sans-serif`;
    ctx.textAlign = "center";
    xs.forEach((x, i) => {
      ctx.fillStyle = COR.no;
      ctx.strokeStyle = i === 2 ? COR.ruim : COR.ok;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, yc, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = COR.tinta;
      ctx.fillText(ROTULOS[i], x, yc + espalhar + 36);
    });
  };
  const quadro = (agora) => {
    const dt = Math.min((agora - anterior) / 1000, 0.05);
    anterior = agora;
    atualizar(dt); desenhar();
    if (rodando) requestAnimationFrame(quadro);
  };
  const iniciar = () => { if (rodando) return; rodando = true; anterior = performance.now(); requestAnimationFrame(quadro); };
  const parar = () => { rodando = false; };
  aoMudarTema.push(() => { COR = lerCores(); desenhar(); });
  medir();
  for (let i = 0; i < 140; i++) atualizar(0.05);
  retidos = 0; retidosEl.textContent = "0";
  desenhar();
  window.addEventListener("resize", () => { medir(); desenhar(); });
  if (document.fonts) document.fonts.ready.then(desenhar);
  if (reduzido) document.getElementById("contador-retidos").hidden = true;
  else new IntersectionObserver((e) => (e[0].isIntersecting ? iniciar() : parar())).observe(canvas);

  const lista = document.getElementById("ciclo-lista");
  const passosCiclo = [...lista.querySelectorAll(".passo-ciclo")];
  const progresso = document.getElementById("ciclo-progresso");
  const atualizarCiclo = () => {
    const ref = window.innerHeight * 0.6;
    const topoLista = lista.getBoundingClientRect().top;
    let ultimoAtivo = -1;
    passosCiclo.forEach((p, i) => {
      const ativo = reduzido || p.getBoundingClientRect().top < ref;
      p.classList.toggle("ativo", ativo);
      if (ativo) ultimoAtivo = i;
    });
    const total = lista.getBoundingClientRect().height - 16;
    let altura = 0;
    if (ultimoAtivo >= 0) {
      const alvo = passosCiclo[ultimoAtivo];
      altura = ultimoAtivo === passosCiclo.length - 1 ? total : alvo.getBoundingClientRect().top - topoLista + 12;
      altura = Math.min(total, Math.max(altura, ref - topoLista));
    }
    progresso.style.height = Math.max(0, Math.min(total, altura)) + "px";
  };
  window.addEventListener("scroll", atualizarCiclo, { passive: true });
  window.addEventListener("resize", atualizarCiclo);
  atualizarCiclo();

  const REGIOES = [
    { nome: "Nordeste", familias: 8.97e6, valor: 6.03e9 },
    { nome: "Sudeste", familias: 5.50e6, valor: 3.68e9 },
    { nome: "Norte", familias: 2.49e6, valor: 1.76e9 },
    { nome: "Sul", familias: 1.32e6, valor: 889.6e6 },
    { nome: "Centro-Oeste", familias: 1.03e6, valor: 713.12e6 }
  ];
  const ESTADOS = [
    { nome: "Bahia", familias: 2.38e6 }, { nome: "São Paulo", familias: 2.31e6 },
    { nome: "Pernambuco", familias: 1.50e6 }, { nome: "Minas Gerais", familias: 1.46e6 },
    { nome: "Rio de Janeiro", familias: 1.43e6 }, { nome: "Ceará", familias: 1.38e6 },
    { nome: "Pará", familias: 1.28e6 }, { nome: "Maranhão", familias: 1.17e6 }
  ];
  const MESES = [
    { nome: "jan", completo: "janeiro", familias: 18.77e6 }, { nome: "fev", completo: "fevereiro", familias: 18.84e6 },
    { nome: "mar", completo: "março", familias: 18.73e6 }, { nome: "abr", completo: "abril", familias: 18.90e6 },
    { nome: "mai", completo: "maio", familias: 19.08e6 }, { nome: "jun", completo: "junho", familias: 19.34e6 }
  ];
  const fmtFamilias = (v) => fmt(v / 1e6, 2) + " mi";
  const fmtValor = (v) => v >= 1e9 ? "R$ " + fmt(v / 1e9, 2) + " bi" : "R$ " + fmt(v / 1e6, 1) + " mi";

  const area = document.getElementById("grafico");
  const tabelaDados = document.getElementById("tabela-dados");
  const grupoMetrica = document.getElementById("metrica");
  const botoesVisao = [...document.querySelectorAll("[data-visao]")];
  const botoesMetrica = [...grupoMetrica.querySelectorAll("button")];
  let visao = "regiao", metrica = "familias";

  const criarDica = () => {
    const d = document.createElement("div");
    d.className = "dica";
    area.appendChild(d);
    return d;
  };
  const posicionarDica = (dica, x, y) => {
    const largura = area.clientWidth;
    const w = dica.offsetWidth;
    dica.style.left = Math.max(8, Math.min(largura - w - 8, x - w / 2)) + "px";
    dica.style.top = (y - dica.offsetHeight - 10) + "px";
  };

  const desenharBarras = (titulo, dados, chave, formatar, extra) => {
    area.innerHTML = `<p class="grafico-titulo">${titulo}</p><div class="barras"></div>`;
    const caixa = area.querySelector(".barras");
    const dica = criarDica();
    const maximo = Math.max(...dados.map((d) => d[chave]));
    dados.forEach((d) => {
      const linha = document.createElement("div");
      linha.className = "barra-linha";
      linha.tabIndex = 0;
      linha.setAttribute("aria-label", `${d.nome}: ${formatar(d[chave])}`);
      linha.innerHTML = `<span class="nome">${d.nome}</span><span class="barra-trilho"><span class="barra"></span></span><span class="valor">${formatar(d[chave])}</span>`;
      caixa.appendChild(linha);
      const barra = linha.querySelector(".barra");
      requestAnimationFrame(() => requestAnimationFrame(() => { barra.style.width = (d[chave] / maximo * 100) + "%"; }));
      const mostrar = () => {
        dica.innerHTML = `<b>${d.nome}</b>${extra(d)}`;
        dica.classList.add("visivel");
        const rArea = area.getBoundingClientRect();
        const rBarra = barra.getBoundingClientRect();
        posicionarDica(dica, rBarra.right - rArea.left, rBarra.top - rArea.top);
      };
      linha.addEventListener("mouseenter", mostrar);
      linha.addEventListener("focus", mostrar);
      linha.addEventListener("mouseleave", () => dica.classList.remove("visivel"));
      linha.addEventListener("blur", () => dica.classList.remove("visivel"));
    });
  };

  const desenharLinha = () => {
    area.innerHTML = `<p class="grafico-titulo">Famílias atendidas por mês em 2026</p><div class="grafico-linha"></div>`;
    const caixa = area.querySelector(".grafico-linha");
    const dica = criarDica();
    const W = Math.max(280, caixa.clientWidth), H = 288;
    const m = { t: 16, r: 16, b: 34, l: 58 };
    const min = 18.6e6, max = 19.4e6;
    const x = (i) => m.l + i * (W - m.l - m.r) / (MESES.length - 1);
    const y = (v) => m.t + (1 - (v - min) / (max - min)) * (H - m.t - m.b);
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Linha com o número de famílias atendidas de janeiro a junho de 2026, de 18,77 milhões a 19,34 milhões.");
    let html = '<g class="eixo">';
    [18.6e6, 18.8e6, 19.0e6, 19.2e6, 19.4e6].forEach((v) => {
      html += `<line class="grade" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`;
      html += `<text x="${m.l - 10}" y="${y(v) + 4}" text-anchor="end">${fmt(v / 1e6, 1)} mi</text>`;
    });
    MESES.forEach((d, i) => { html += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${d.nome}</text>`; });
    html += "</g>";
    const caminho = MESES.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.familias)}`).join(" ");
    html += `<path d="${caminho}" fill="none" style="stroke: var(--chart)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" class="traco"/>`;
    html += `<line class="mira" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" style="stroke: var(--faint)" stroke-dasharray="3 3" opacity="0"/>`;
    MESES.forEach((d, i) => { html += `<circle class="ponto" cx="${x(i)}" cy="${y(d.familias)}" r="4.5" style="fill: var(--chart); stroke: var(--surface)" stroke-width="2"/>`; });
    const ultimo = MESES[MESES.length - 1];
    html += `<text x="${x(MESES.length - 1) - 10}" y="${y(ultimo.familias) - 12}" text-anchor="end" style="fill: var(--ink); font: 700 13px var(--body)">${fmtFamilias(ultimo.familias)}</text>`;
    html += `<rect class="captura" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/>`;
    svg.innerHTML = html;
    caixa.appendChild(svg);

    const traco = svg.querySelector(".traco");
    if (!reduzido && traco.getTotalLength) {
      const comp = traco.getTotalLength();
      traco.style.strokeDasharray = comp;
      traco.style.strokeDashoffset = comp;
      traco.getBoundingClientRect();
      traco.style.transition = "stroke-dashoffset 1s ease-out";
      traco.style.strokeDashoffset = 0;
    }
    const mira = svg.querySelector(".mira");
    const circulos = [...svg.querySelectorAll(".ponto")];
    const captura = svg.querySelector(".captura");
    captura.addEventListener("mousemove", (e) => {
      const r = svg.getBoundingClientRect();
      const px = (e.clientX - r.left) * (W / r.width);
      let i = Math.round((px - m.l) / ((W - m.l - m.r) / (MESES.length - 1)));
      i = Math.max(0, Math.min(MESES.length - 1, i));
      const d = MESES[i];
      mira.setAttribute("x1", x(i)); mira.setAttribute("x2", x(i)); mira.setAttribute("opacity", "1");
      circulos.forEach((c, j) => c.setAttribute("r", j === i ? 6.5 : 4.5));
      dica.innerHTML = `<b>${d.completo} de 2026</b>${fmtFamilias(d.familias)} de famílias`;
      dica.classList.add("visivel");
      const escala = r.width / W;
      const rArea = area.getBoundingClientRect();
      posicionarDica(dica, r.left - rArea.left + x(i) * escala, r.top - rArea.top + y(d.familias) * escala);
    });
    captura.addEventListener("mouseleave", () => {
      mira.setAttribute("opacity", "0");
      circulos.forEach((c) => c.setAttribute("r", 4.5));
      dica.classList.remove("visivel");
    });
  };

  const tabelaHTML = (cabecalho, linhas) =>
    `<table><thead><tr>${cabecalho.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${linhas.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  const renderizarPainel = () => {
    grupoMetrica.hidden = visao !== "regiao";
    if (visao === "regiao") {
      const titulo = metrica === "familias" ? "Famílias atendidas por região, junho de 2026" : "Valor repassado por região, junho de 2026";
      const formatar = metrica === "familias" ? fmtFamilias : fmtValor;
      desenharBarras(titulo, REGIOES, metrica, formatar, (d) => `${fmtFamilias(d.familias)} de famílias<br>${fmtValor(d.valor)} repassados`);
      tabelaDados.innerHTML = tabelaHTML(["Região", "Famílias", "Valor repassado"], REGIOES.map((d) => [d.nome, fmtFamilias(d.familias), fmtValor(d.valor)]));
    } else if (visao === "estado") {
      desenharBarras("Estados com mais famílias atendidas, junho de 2026", ESTADOS, "familias", fmtFamilias, (d) => `${fmtFamilias(d.familias)} de famílias`);
      tabelaDados.innerHTML = tabelaHTML(["Estado", "Famílias"], ESTADOS.map((d) => [d.nome, fmtFamilias(d.familias)]));
    } else {
      desenharLinha();
      tabelaDados.innerHTML = tabelaHTML(["Mês (2026)", "Famílias"], MESES.map((d) => [d.completo, fmtFamilias(d.familias)]));
    }
  };
  botoesVisao.forEach((b) => b.addEventListener("click", () => {
    visao = b.dataset.visao;
    botoesVisao.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    renderizarPainel();
  }));
  botoesMetrica.forEach((b) => b.addEventListener("click", () => {
    metrica = b.dataset.metrica;
    botoesMetrica.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    renderizarPainel();
  }));
  let painelVisto = false;
  new IntersectionObserver((e, obs) => {
    if (e[0].isIntersecting && !painelVisto) { painelVisto = true; renderizarPainel(); obs.disconnect(); }
  }, { threshold: 0.2 }).observe(area);
  let tempoResize;
  window.addEventListener("resize", () => {
    clearTimeout(tempoResize);
    tempoResize = setTimeout(() => { if (painelVisto && visao === "mes") renderizarPainel(); }, 200);
  });

  const COLUNAS = ["municipio", "uf", "codigo_ibge", "referencia", "cnpj"];
  const AMOSTRA_INICIAL = {
    mes: "08",
    linhas: [
      { municipio: "SÃƒO PAULO", uf: "SP", codigo_ibge: "3550308", referencia: "01/08/2026", cnpj: "11222333000181" },
      { municipio: "BRASÍLIA", uf: "DF", codigo_ibge: "5300108", referencia: "2026-08-01", cnpj: "22.333.444/0001-55" },
      { municipio: "GOIÃ‚NIA", uf: "GO", codigo_ibge: "5208707", referencia: "1/8/2026", cnpj: "1234567000189.0" },
      { municipio: "GOIÂNIA", uf: "GO", codigo_ibge: "5208707", referencia: "2026-08-01 00:00:00", cnpj: "01.234.567/0001-89" },
      { municipio: "BELÃ‰M", uf: "PA", codigo_ibge: "1501402", referencia: "01/08/2026", cnpj: "11444777000161" },
      { municipio: "CUIABÁ", uf: "MT", codigo_ibge: "", referencia: "2026-08-01", cnpj: "33.444.555/0001-02" },
      { municipio: "RECIFE", uf: "PE", codigo_ibge: "2611606", referencia: "1/8/2026", cnpj: "44555666000177" }
    ]
  };
  const MUNICIPIOS = [
    ["SÃO PAULO", "SP", "3550308"], ["RIBEIRÃO PRETO", "SP", "3543402"], ["SÃO JOSÉ DOS CAMPOS", "SP", "3549904"],
    ["GOIÂNIA", "GO", "5208707"], ["UBERLÂNDIA", "MG", "3170206"], ["BELO HORIZONTE", "MG", "3106200"],
    ["BELÉM", "PA", "1501402"], ["SANTARÉM", "PA", "1506807"], ["RECIFE", "PE", "2611606"], ["CARUARU", "PE", "2604106"],
    ["JOÃO PESSOA", "PB", "2507507"], ["MACEIÓ", "AL", "2704302"], ["MOSSORÓ", "RN", "2408003"], ["NATAL", "RN", "2408102"],
    ["FLORIANÓPOLIS", "SC", "4205407"], ["CRICIÚMA", "SC", "4204608"], ["FOZ DO IGUAÇU", "PR", "4108304"], ["CURITIBA", "PR", "4106902"],
    ["VITÓRIA", "ES", "3205309"], ["PETRÓPOLIS", "RJ", "3303906"], ["RIO DE JANEIRO", "RJ", "3304557"], ["SALVADOR", "BA", "2927408"],
    ["FORTALEZA", "CE", "2304400"], ["TERESINA", "PI", "2211001"], ["MANAUS", "AM", "1302603"], ["CUIABÁ", "MT", "5103403"],
    ["BRASÍLIA", "DF", "5300108"], ["PALMAS", "TO", "1721000"], ["PORTO ALEGRE", "RS", "4314902"], ["CAMPO GRANDE", "MS", "5002704"]
  ];
  const CP1252 = { 128: "€", 130: "‚", 131: "ƒ", 132: "„", 133: "…", 134: "†", 135: "‡", 136: "ˆ", 137: "‰", 138: "Š", 139: "‹", 140: "Œ", 142: "Ž", 145: "‘", 146: "’", 147: "“", 148: "”", 149: "•", 150: "–", 151: "—", 152: "˜", 153: "™", 154: "š", 155: "›", 156: "œ", 158: "ž", 159: "Ÿ" };
  const CP1252_REVERSO = Object.fromEntries(Object.entries(CP1252).map(([byte, letra]) => [letra, Number(byte)]));

  const quebrarEncoding = (texto) => {
    const letras = [];
    for (const byte of new TextEncoder().encode(texto)) {
      if (byte >= 128 && byte <= 159) {
        if (!CP1252[byte]) return null;
        letras.push(CP1252[byte]);
      } else {
        letras.push(String.fromCharCode(byte));
      }
    }
    return letras.join("");
  };
  const corrigirEncoding = (texto) => {
    try {
      const bytes = [...texto].map((letra) => {
        if (letra in CP1252_REVERSO) return CP1252_REVERSO[letra];
        const codigo = letra.charCodeAt(0);
        if (codigo > 255) throw new Error("fora do cp1252");
        return codigo;
      });
      return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
    } catch (erro) {
      return texto;
    }
  };
  const mesDe = (valor) => {
    let m;
    if ((m = valor.match(/^(\d{4})-(\d{2})/))) return `${m[1]}-${m[2]}`;
    if ((m = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return `${m[3]}-${m[2].padStart(2, "0")}`;
    return valor;
  };
  const formatarCnpj = (valor) => {
    const d = valor.replace(/\.0$/, "").replace(/\D/g, "").padStart(14, "0");
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  };
  const indicesDuplicados = (linhas) => {
    const vistos = new Set();
    const repetidos = [];
    linhas.forEach((l, i) => {
      if (l.codigo_ibge === "") return;
      const chave = l.codigo_ibge + "|" + mesDe(l.referencia);
      if (vistos.has(chave)) repetidos.push(i); else vistos.add(chave);
    });
    return repetidos;
  };
  const temProblema = (coluna, valor) => {
    if (coluna === "municipio") return corrigirEncoding(valor) !== valor;
    if (coluna === "referencia") return !/^\d{4}-\d{2}$/.test(valor);
    if (coluna === "cnpj") return !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(valor);
    if (coluna === "codigo_ibge") return valor === "";
    return false;
  };
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const embaralhar = (lista) => lista.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((v) => v[1]);
  const FORMATOS_DATA = [
    (mes) => `01/${mes}/2026`,
    (mes) => `1/${Number(mes)}/2026`,
    (mes) => `2026-${mes}-01`,
    (mes) => `2026-${mes}-01 00:00:00`,
    (mes) => `2026-${mes}`
  ];
  const gerarDigitosCnpj = (comZero) => {
    let d = comZero ? "0" : String(1 + Math.floor(Math.random() * 9));
    while (d.length < 10) d += Math.floor(Math.random() * 10);
    return d.slice(0, 8) + "0001" + d.slice(8, 10);
  };
  const escreverCnpj = (digitos, formato) => {
    if (formato === "formatado") return formatarCnpj(digitos);
    if (formato === "excel") return digitos.replace(/^0+/, "") + ".0";
    return digitos;
  };
  const gerarAmostra = () => {
    const mes = String(1 + Math.floor(Math.random() * 9)).padStart(2, "0");
    const escolhidos = embaralhar(MUNICIPIOS).slice(0, 6 + Math.floor(Math.random() * 2));
    const linhas = escolhidos.map(([nome, uf, ibge]) => {
      const quebrado = quebrarEncoding(nome);
      const formatoCnpj = sortear(["cru", "cru", "formatado", "excel"]);
      const digitos = gerarDigitosCnpj(formatoCnpj === "excel" || Math.random() < 0.15);
      return {
        municipio: quebrado && quebrado !== nome && Math.random() < 0.6 ? quebrado : nome,
        uf, codigo_ibge: ibge,
        referencia: sortear(FORMATOS_DATA)(mes),
        cnpj: escreverCnpj(digitos, formatoCnpj),
        nome, digitos
      };
    });
    if (!linhas.some((l) => l.municipio !== l.nome)) {
      const candidata = linhas.find((l) => quebrarEncoding(l.nome) && quebrarEncoding(l.nome) !== l.nome);
      if (candidata) candidata.municipio = quebrarEncoding(candidata.nome);
    }
    const posicoes = embaralhar(linhas.map((_, i) => i));
    const origensDuplicadas = posicoes.slice(0, 1 + Math.floor(Math.random() * 2));
    posicoes.slice(origensDuplicadas.length, origensDuplicadas.length + Math.floor(Math.random() * 3))
      .forEach((i) => { linhas[i].codigo_ibge = ""; });
    origensDuplicadas.sort((a, b) => b - a).forEach((i) => {
      const original = linhas[i];
      const quebrado = quebrarEncoding(original.nome);
      const copia = {
        ...original,
        municipio: quebrado && Math.random() < 0.5 ? quebrado : original.nome,
        referencia: sortear(FORMATOS_DATA.filter((f) => f(mes) !== original.referencia))(mes),
        cnpj: escreverCnpj(original.digitos, original.cnpj.includes("/") ? "cru" : "formatado")
      };
      linhas.splice(i + 1 + Math.floor(Math.random() * 2), 0, copia);
    });
    return { mes, linhas: linhas.map(({ municipio, uf, codigo_ibge, referencia, cnpj }) => ({ municipio, uf, codigo_ibge, referencia, cnpj })) };
  };

  const CODIGO_LEITURA = String.raw`import pandas as pd

# Planilha recebida da área técnica (dados fictícios)
df = pd.read_excel("repasses_municipios.xlsx", dtype=str)
df.head()`;
  const PASSOS = [
    {
      nome: "Corrigir encoding",
      codigo: String.raw`def corrigir_encoding(texto):
    try:
        # "SÃƒO PAULO" vira "SÃO PAULO"
        return texto.encode("cp1252").decode("utf-8")
    except UnicodeError:
        return texto

df["municipio"] = df["municipio"].map(corrigir_encoding)`,
      executar(linhas) {
        const mudadas = [];
        linhas.forEach((l, i) => {
          const novo = corrigirEncoding(l.municipio);
          if (novo !== l.municipio) { l.municipio = novo; mudadas.push(i + ":municipio"); }
        });
        const texto = mudadas.length ? `${plural(mudadas.length, "nome de município", "nomes de município")} com acentuação corrigida` : "Nenhum nome com problema de acentuação";
        return { mudadas, log: [[texto]] };
      }
    },
    {
      nome: "Padronizar datas",
      codigo: String.raw`# Datas chegam em vários formatos: 01/08/2026, 1/8/2026, 2026-08-01...
df["referencia"] = (
    pd.to_datetime(df["referencia"], format="mixed", dayfirst=True)
      .dt.strftime("%Y-%m")
)`,
      executar(linhas) {
        const mudadas = [];
        linhas.forEach((l, i) => {
          const novo = mesDe(l.referencia);
          if (novo !== l.referencia) { l.referencia = novo; mudadas.push(i + ":referencia"); }
        });
        const texto = mudadas.length ? `${plural(mudadas.length, "data convertida", "datas convertidas")} para o formato AAAA-MM` : "Todas as datas já estavam no formato AAAA-MM";
        return { mudadas, log: [[texto]] };
      }
    },
    {
      nome: "Formatar CNPJ",
      codigo: String.raw`import re

def formatar_cnpj(valor):
    # O Excel trata CNPJ como número: some o zero à esquerda e aparece ".0"
    digitos = re.sub(r"\D", "", valor.removesuffix(".0")).zfill(14)
    return f"{digitos[:2]}.{digitos[2:5]}.{digitos[5:8]}/{digitos[8:12]}-{digitos[12:]}"

df["cnpj"] = df["cnpj"].map(formatar_cnpj)`,
      executar(linhas) {
        const mudadas = [];
        let recuperados = 0;
        linhas.forEach((l, i) => {
          const novo = formatarCnpj(l.cnpj);
          if (novo === l.cnpj) return;
          if (/\.0$/.test(l.cnpj)) recuperados++;
          l.cnpj = novo; mudadas.push(i + ":cnpj");
        });
        let texto = mudadas.length ? plural(mudadas.length, "CNPJ padronizado", "CNPJs padronizados") : "Todos os CNPJs já estavam no formato certo";
        if (recuperados) texto += `, ${plural(recuperados, "com o zero à esquerda recuperado", "com o zero à esquerda recuperado")}`;
        return { mudadas, log: [[texto]] };
      }
    },
    {
      nome: "Remover duplicados",
      codigo: String.raw`# Cada município aparece uma vez por mês de referência
mes = pd.to_datetime(df["referencia"], format="mixed", dayfirst=True).dt.to_period("M")
antes = len(df)
df = df[~df.assign(mes=mes).duplicated(subset=["codigo_ibge", "mes"])]
print(f"{antes - len(df)} registro(s) duplicado(s) removido(s)")`,
      executar(linhas) {
        const removidas = indicesDuplicados(linhas);
        const nomes = removidas.map((i) => corrigirEncoding(linhas[i].municipio)).join(", ");
        const texto = removidas.length ? `${plural(removidas.length, "registro duplicado removido", "registros duplicados removidos")} (${nomes})` : "Nenhum registro duplicado encontrado";
        return { removidas, log: [[texto]] };
      }
    },
    {
      nome: "Separar ausentes",
      codigo: String.raw`# Registros sem código IBGE não entram na carga
pendentes = df[df["codigo_ibge"].isna()]
df = df.dropna(subset=["codigo_ibge"])

pendentes.to_csv("pendencias.csv", index=False)
df.to_csv("carga_municipios.csv", index=False)`,
      executar(linhas) {
        let n = 0;
        linhas.forEach((l) => { if (l.codigo_ibge === "") { l.pendente = true; n++; } });
        if (!n) return { mudadas: [], log: [["Nenhum registro sem código IBGE"]] };
        return { mudadas: [], log: [[`${plural(n, "registro sem código IBGE enviado", "registros sem código IBGE enviados")} para pendências`, "aviso"]] };
      }
    }
  ];

  const tbody = document.getElementById("tabela");
  const passosEl = document.getElementById("passos");
  const codigoEl = document.getElementById("codigo");
  const codigoTitulo = document.getElementById("codigo-titulo");
  const logEl = document.getElementById("log");
  const problemasEl = document.getElementById("problemas");
  const btnTudo = document.getElementById("executar-tudo");
  const btnReiniciar = document.getElementById("reiniciar");
  const btnNova = document.getElementById("nova-amostra");
  const btnCsv = document.getElementById("baixar-csv");
  let amostra = AMOSTRA_INICIAL, linhas = [], feitos = new Set(), ocupado = false;

  const escapar = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const realcar = (codigo) => {
    const re = /(#[^\n]*)|("(?:[^"\\\n]|\\.)*")|\b(import|from|as|def|return|try|except|print|len)\b/g;
    let saida = "", ultimo = 0, m;
    while ((m = re.exec(codigo))) {
      saida += escapar(codigo.slice(ultimo, m.index));
      const classe = m[1] ? "tk-c" : m[2] ? "tk-s" : "tk-k";
      saida += `<span class="${classe}">${escapar(m[0])}</span>`;
      ultimo = re.lastIndex;
    }
    return saida + escapar(codigo.slice(ultimo));
  };
  const desenharTabela = (mudadas = [], removendo = []) => {
    const marcadas = new Set(mudadas);
    let total = 0;
    tbody.innerHTML = "";
    linhas.forEach((l, i) => {
      const tr = document.createElement("tr");
      if (l.pendente) tr.className = "pendente";
      if (removendo.includes(i)) tr.className = "removendo";
      COLUNAS.forEach((c) => {
        const td = document.createElement("td");
        const valor = l[c];
        if (valor === "") td.classList.add("vazio"); else td.textContent = valor;
        if (!l.pendente && temProblema(c, valor)) { td.classList.add("problema"); total++; }
        if (marcadas.has(i + ":" + c)) td.classList.add("mudou");
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    const restantes = total + (removendo.length ? 0 : indicesDuplicados(linhas).length);
    problemasEl.classList.toggle("zerado", restantes === 0);
    problemasEl.textContent = restantes === 0 ? "Pronto para carga" : plural(restantes, "problema encontrado", "problemas encontrados");
  };
  const desenharPassos = () => {
    passosEl.innerHTML = "";
    PASSOS.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button";
      const feito = feitos.has(i);
      b.className = "passo" + (feito ? " feito" : "");
      b.disabled = ocupado || feito;
      b.innerHTML = `<span class="n" aria-hidden="true">${feito ? "✓" : i + 1}</span>${p.nome}`;
      b.setAttribute("aria-label", `${p.nome}${feito ? " (concluído)" : ""}`);
      b.addEventListener("click", () => executarPasso(i));
      passosEl.appendChild(b);
    });
    btnTudo.disabled = ocupado || feitos.size === PASSOS.length;
    btnReiniciar.disabled = ocupado;
    btnNova.disabled = ocupado;
    btnCsv.disabled = feitos.size < PASSOS.length;
  };
  const registrar = (texto, classe) => {
    const li = document.createElement("li");
    li.textContent = texto;
    if (classe) li.className = classe;
    logEl.appendChild(li);
    logEl.scrollTop = logEl.scrollHeight;
  };
  const concluir = () => {
    if (feitos.size === PASSOS.length) {
      registrar(`Arquivo de carga pronto com ${plural(linhas.filter((l) => !l.pendente).length, "registro válido", "registros válidos")}`);
    }
  };
  const executarPasso = (indice) => new Promise((resolver) => {
    if (ocupado || feitos.has(indice)) return resolver();
    const passo = PASSOS[indice];
    const resultado = passo.executar(linhas);
    codigoTitulo.textContent = passo.nome;
    codigoEl.innerHTML = realcar(passo.codigo);
    resultado.log.forEach(([t, c]) => registrar(t, c));
    feitos.add(indice);
    if (resultado.removidas && resultado.removidas.length) {
      ocupado = true;
      desenharTabela([], resultado.removidas);
      desenharPassos();
      setTimeout(() => {
        linhas = linhas.filter((_, i) => !resultado.removidas.includes(i));
        ocupado = false;
        desenharTabela(); desenharPassos(); concluir(); resolver();
      }, reduzido ? 0 : 750);
    } else {
      desenharTabela(resultado.mudadas || []);
      desenharPassos(); concluir();
      resolver();
    }
  });
  const reiniciar = () => {
    linhas = amostra.linhas.map((l) => ({ ...l }));
    feitos = new Set(); ocupado = false;
    codigoTitulo.textContent = "Leitura da planilha";
    codigoEl.innerHTML = realcar(CODIGO_LEITURA);
    logEl.innerHTML = "";
    registrar(`${plural(linhas.length, "registro lido", "registros lidos")} da planilha`);
    desenharTabela(); desenharPassos();
  };
  btnTudo.addEventListener("click", async () => {
    const pendentes = PASSOS.map((_, i) => i).filter((i) => !feitos.has(i));
    for (const [n, i] of pendentes.entries()) {
      if (n) {
        ocupado = true; desenharPassos();
        await new Promise((r) => setTimeout(r, reduzido ? 0 : 900));
        ocupado = false;
      }
      await executarPasso(i);
    }
    desenharPassos();
  });
  btnReiniciar.addEventListener("click", reiniciar);
  btnNova.addEventListener("click", () => { amostra = gerarAmostra(); reiniciar(); });
  const baixarArquivo = (blob, nome) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  btnCsv.addEventListener("click", () => {
    const validas = linhas.filter((l) => !l.pendente);
    const csv = "﻿" + [COLUNAS.join(","), ...validas.map((l) => COLUNAS.map((c) => l[c]).join(","))].join("\n");
    baixarArquivo(new Blob([csv], { type: "text/csv;charset=utf-8" }), `carga_municipios_2026-${amostra.mes}.csv`);
  });
  reiniciar();

  const filtros = [...document.querySelectorAll(".filtro")];
  const projetos = [...document.querySelectorAll(".projeto")];
  filtros.forEach((f) => f.addEventListener("click", () => {
    const tipo = f.dataset.filtro;
    filtros.forEach((x) => x.setAttribute("aria-pressed", String(x === f)));
    projetos.forEach((p) => { p.hidden = tipo !== "todos" && !p.dataset.tipos.split(" ").includes(tipo); });
  }));

  const USOS = {
    pandas: { nome: "Python e pandas", itens: [["MDS", "Fluxos de ETL que geram os arquivos de carga do VIS DATA"], ["MDS", "Pipelines orçamentários a partir do Tesouro Gerencial"], ["Projeto", "Análise exploratória da base Online Retail"], ["Projeto", "Modelo de previsão do Titanic"]] },
    etl: { nome: "ETL e qualidade de dados", itens: [["MDS", "Ciclo de carga do Bolsa Família de agosto de 2026, com 154 registros barrados"], ["MDS", "Padronização do IGD-E publicado em 3 layouts diferentes"], ["MDS", "QA do novo Relatório de Informações"], ["Estágio no MDS", "Cruzamento e tratamento de bases de dados"]] },
    sql: { nome: "SQL", itens: [["Projeto", "Banco relacional da Olist com 1,5 milhão de linhas, window functions e validação de qualidade"], ["Estágio no MDS", "Consultas e extração de dados em banco de dados"], ["Projeto", "Banco do portal do Bolsa Família e Cadastro Único"]] },
    r: { nome: "R e Shiny", itens: [["MDS", "Manutenção de módulos do painel MonitoraMDS"]] },
    ml: { nome: "Machine learning", itens: [["Projeto", "Classificação com Gradient Boosting na base do Titanic"]] },
    colab: { nome: "Google Colab", itens: [["MDS", "Notebook único que reúne todas as rotinas de carga"]] },
    sqlite: { nome: "SQLite", itens: [["Projeto", "Modelo relacional da Olist com chaves, restrições e índices"], ["Projeto", "Banco com modelagem dimensional do portal do Bolsa Família e Cadastro Único"]] },
    dbeaver: { nome: "DBeaver", itens: [["Estágio no MDS", "Consultas SQL e extração de dados"]] },
    react: { nome: "React", itens: [["Projeto", "Interface do portal do Bolsa Família e Cadastro Único"]] },
    fastapi: { nome: "FastAPI", itens: [["Projeto", "API do portal do Bolsa Família e Cadastro Único"]] }
  };
  const chips = [...document.querySelectorAll("button.chip")];
  const ondeTitulo = document.getElementById("onde-titulo");
  const ondeLista = document.getElementById("onde-lista");
  const mostrarUso = (chave) => {
    const uso = USOS[chave];
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.hab === chave)));
    ondeTitulo.textContent = uso.nome;
    ondeLista.innerHTML = "";
    uso.itens.forEach(([onde, texto]) => {
      const li = document.createElement("li");
      const s = document.createElement("span");
      s.textContent = onde;
      li.append(s, texto);
      ondeLista.appendChild(li);
    });
  };
  chips.forEach((c) => c.addEventListener("click", () => mostrarUso(c.dataset.hab)));
  mostrarUso("pandas");

  document.getElementById("copiar-email").addEventListener("click", async () => {
    const email = "contato.joaovlqueiroz@gmail.com";
    try { await navigator.clipboard.writeText(email); avisar("E-mail copiado"); }
    catch (e) { avisar(email); }
  });

  mostrarTema();
})();
