(() => {
  const menu = document.querySelector(".navegacao");
  const links = [...document.querySelectorAll(".menu a")];
  const secoes = links.map((a) => document.querySelector(a.getAttribute("href")));
  const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const marcarBordas = () => {
    const sobra = menu.scrollWidth - menu.clientWidth;
    menu.classList.toggle("mais-esquerda", sobra > 1 && menu.scrollLeft > 1);
    menu.classList.toggle("mais-direita", sobra > 1 && menu.scrollLeft < sobra - 1);
  };

  const mostrarNoMenu = (link) => {
    if (menu.scrollWidth <= menu.clientWidth) return;
    const rMenu = menu.getBoundingClientRect();
    const rLink = link.getBoundingClientRect();
    if (rLink.left >= rMenu.left && rLink.right <= rMenu.right) return;
    const alvo = menu.scrollLeft + rLink.left - rMenu.left - (rMenu.width - rLink.width) / 2;
    menu.scrollTo({ left: alvo, behavior: reduzido ? "auto" : "smooth" });
  };

  let ativo = -1;
  const marcarSecao = () => {
    const limite = innerHeight * 0.4;
    let atual = -1;
    secoes.forEach((secao, i) => { if (secao && secao.getBoundingClientRect().top <= limite) atual = i; });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) atual = secoes.length - 1;
    if (atual === ativo) return;
    ativo = atual;
    links.forEach((link, i) => {
      if (i === atual) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    if (atual >= 0) mostrarNoMenu(links[atual]);
    else menu.scrollTo({ left: 0, behavior: reduzido ? "auto" : "smooth" });
  };

  let quadro = 0;
  const agendar = () => {
    if (quadro) return;
    quadro = requestAnimationFrame(() => { quadro = 0; marcarSecao(); });
  };
  addEventListener("scroll", agendar, { passive: true });
  addEventListener("resize", () => { agendar(); marcarBordas(); });
  menu.addEventListener("scroll", marcarBordas, { passive: true });
  marcarSecao();
  marcarBordas();

  const ajustarFoco = (regiao) => {
    const rola = regiao.scrollWidth > regiao.clientWidth + 1 || regiao.scrollHeight > regiao.clientHeight + 1;
    if (rola) regiao.setAttribute("tabindex", "0");
    else regiao.removeAttribute("tabindex");
  };
  const regioes = [...document.querySelectorAll("[data-rolagem]")];
  const aoRedimensionar = new ResizeObserver((entradas) => entradas.forEach((e) => ajustarFoco(e.target)));
  const aoMudar = new MutationObserver((mudancas) => new Set(mudancas.map((m) => m.target.closest("[data-rolagem]"))).forEach((r) => r && ajustarFoco(r)));
  regioes.forEach((regiao) => {
    aoRedimensionar.observe(regiao);
    aoMudar.observe(regiao, { childList: true, subtree: true, characterData: true });
    ajustarFoco(regiao);
  });
})();
