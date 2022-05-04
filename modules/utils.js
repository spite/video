function initLinks() {
  const links = document.querySelectorAll("a[rel=external]");
  for (let j = 0; j < links.length; j++) {
    const a = links[j];
    a.addEventListener(
      "click",
      (e) => {
        window.open(e.target.href, "_blank");
        e.preventDefault();
      },
      false
    );
  }
}

initLinks();
