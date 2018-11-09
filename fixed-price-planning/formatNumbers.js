export default n => {
  const c = 2;
  const d = ".";
  const t = ",";
  const s = n < 0 ? "-" : "";
  const i = String(parseInt((n = Math.abs(Number(n) || 0).toFixed(c))));
  let j = i.length;
  j = j > 3 ? j % 3 : 0;
  return (
    s +
    (j ? i.substr(0, j) + t : "") +
    i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) +
    (c
      ? d +
        Math.abs(n - i)
          .toFixed(c)
          .slice(2)
      : "")
  );
};
