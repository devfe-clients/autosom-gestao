export function meta(titulo: string, descricao: string) {
  const t = `${titulo} — Adriano Auto Som`;
  return {
    meta: [
      { title: t },
      { name: "description", content: descricao },
      { property: "og:title", content: t },
      { property: "og:description", content: descricao },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
