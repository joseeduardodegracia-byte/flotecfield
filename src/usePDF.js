import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (n, dec=2) => Number(n||0).toLocaleString("es-PA", { minimumFractionDigits:dec, maximumFractionDigits:dec });

export function exportQuotePDF(quote, client, eq) {
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W = doc.internal.pageSize.getWidth();
  const orange = [230, 81, 0];
  const blue   = [21, 101, 192];
  const dark   = [11, 22, 36];
  const gray   = [100, 120, 140];

  // Header bar
  doc.setFillColor(...blue);
  doc.rect(0, 0, W, 28, "F");

  doc.setTextColor(255,255,255);
  doc.setFontSize(18); doc.setFont("helvetica","bold");
  doc.text("FlotecField", 14, 12);
  doc.setFontSize(9); doc.setFont("helvetica","normal");
  doc.text("Grupo Flotec S.A. · Atlas Copco · Panamá y Centroamérica", 14, 20);

  // Quote title
  doc.setTextColor(...dark);
  doc.setFontSize(16); doc.setFont("helvetica","bold");
  doc.text(quote.title || "Cotización", 14, 42);

  // Orange accent line
  doc.setFillColor(...orange);
  doc.rect(14, 45, 60, 1, "F");

  // Info grid
  const exp = new Date(quote.date); exp.setDate(exp.getDate()+(parseInt(quote.validDays)||30));
  const infoRows = [
    ["Fecha:", quote.date, "Válida hasta:", exp.toISOString().slice(0,10)],
    ["Cliente:", client?.name||"—", "Equipo:", eq ? eq.brand+" "+eq.model : "—"],
    ["N° de serie:", eq?.serial||"—", "ITBMS:", quote.applyITBMS?"Aplicado (7%)":"Excluido"],
  ];
  let y = 52;
  doc.setFontSize(9);
  infoRows.forEach(row => {
    doc.setFont("helvetica","bold"); doc.setTextColor(...gray);
    doc.text(row[0], 14, y);
    doc.setFont("helvetica","normal"); doc.setTextColor(...dark);
    doc.text(row[1], 40, y);
    doc.setFont("helvetica","bold"); doc.setTextColor(...gray);
    doc.text(row[2], 110, y);
    doc.setFont("helvetica","normal"); doc.setTextColor(...dark);
    doc.text(row[3], 136, y);
    y += 6;
  });

  // Items table
  const tableData = quote.items.map((item,i) => [
    i+1,
    item.name||"Sin descripción",
    item.pn||"—",
    item.qty||1,
    "$"+fmt(parseFloat(item.price)||0),
    "$"+fmt((parseFloat(item.price)||0)*(parseFloat(item.qty)||1)),
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [["#","Descripción","P/N","Cant.","P. Unit.","Subtotal"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: blue, textColor: 255, fontStyle:"bold", fontSize:9 },
    bodyStyles: { fontSize:9, textColor: dark },
    alternateRowStyles: { fillColor: [240, 245, 255] },
    columnStyles: { 0:{cellWidth:10,halign:"center"}, 2:{cellWidth:28}, 3:{cellWidth:15,halign:"center"}, 4:{cellWidth:24,halign:"right"}, 5:{cellWidth:26,halign:"right"} },
    margin: { left:14, right:14 },
  });

  // Totals
  const finalY = doc.lastAutoTable.finalY + 6;
  const boxX = W - 80;

  doc.setFillColor(245, 248, 255);
  doc.roundedRect(boxX-4, finalY-4, 74, quote.applyITBMS?38:28, 3, 3, "F");

  doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(...gray);
  doc.text("Subtotal:", boxX, finalY+4); doc.setTextColor(...dark); doc.text("$"+fmt(quote.subtotal), W-16, finalY+4, {align:"right"});
  if (quote.applyITBMS) {
    doc.setTextColor(...gray); doc.text("ITBMS (7%):", boxX, finalY+12); doc.setTextColor(...dark); doc.text("$"+fmt(quote.itbmsAmt), W-16, finalY+12, {align:"right"});
  }

  // Total box
  const totY = finalY + (quote.applyITBMS ? 20 : 10);
  doc.setFillColor(...orange);
  doc.roundedRect(boxX-4, totY-5, 74, 14, 3, 3, "F");
  doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
  doc.text("TOTAL:", boxX, totY+4);
  doc.text("$"+fmt(quote.total), W-16, totY+4, {align:"right"});

  // Notes
  if (quote.notes) {
    const notY = totY + 20;
    doc.setFillColor(248,248,248);
    doc.roundedRect(14, notY-4, W-28, 18, 2, 2, "F");
    doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(...gray);
    doc.text("Notas y condiciones:", 18, notY+2);
    doc.setFont("helvetica","normal"); doc.setTextColor(...dark);
    const lines = doc.splitTextToSize(quote.notes, W-36);
    doc.text(lines.slice(0,3), 18, notY+8);
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...blue);
  doc.rect(0, pageH-12, W, 12, "F");
  doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(255,255,255);
  doc.text("Grupo Flotec S.A. · Atlas Copco Authorized Distributor · Panamá y Centroamérica", W/2, pageH-4, {align:"center"});

  const filename = (quote.title||"cotizacion").replace(/\s+/g,"_").toLowerCase()+"_flotec.pdf";
  doc.save(filename);
}
