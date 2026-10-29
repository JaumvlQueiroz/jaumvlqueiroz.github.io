try {
  const tema = localStorage.getItem("tema");
  if (tema === "light" || tema === "dark") document.documentElement.setAttribute("data-theme", tema);
} catch (e) {}
