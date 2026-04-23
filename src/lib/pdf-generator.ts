
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatQuoteId } from './utils';

const primaryRed: [number, number, number] = [192, 0, 0]; // #C00000
const textDark: [number, number, number] = [30, 41, 59]; // slate-900 equivalent
const textGray: [number, number, number] = [100, 116, 139]; // slate-500
const lineGray: [number, number, number] = [203, 213, 225]; // slate-300

interface PDFData {
  quote: any;
  items: any[];
  advisor: any;
}

/**
 * Robustly converts an image URL to a Base64 data string.
 * Uses an Image object with crossOrigin='anonymous' to try and bypass
 * CORS restrictions that 'fetch' might hit.
 */
const getBase64ImageFromUrl = async (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Asegurar fondo transparente
      ctx.drawImage(img, 0, 0);
      try {
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (e) {
        console.error('CORS/Security Error converting image to base64:', e);
        resolve(null);
      }
    };
    img.onerror = (err) => {
      console.error('Error loading image for PDF:', url, err);
      resolve(null);
    };
    img.src = url;
  });
};

export const generateQuotePDF = async ({ quote, items, advisor }: PDFData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors
  const primaryRed = [192, 0, 0]; // #C00000
  const textDark = [30, 41, 59]; // slate-900 equivalent

  // 1. Header & Logo
  const logoBase64 = await getBase64ImageFromUrl('/img/logo-rojo-negro.png');

  // Helper for page decorations (Watermark & Footer)
  const decoratedPages = new Set<number>();
  const addPageDecorations = (doc: jsPDF) => {
    const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
    if (decoratedPages.has(currentPage)) return;
    decoratedPages.add(currentPage);

    // Watermark
    if (logoBase64) {
      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
      const imgProps = doc.getImageProperties(logoBase64);
      const wWidth = 80;
      const wHeight = (imgProps.height * wWidth) / imgProps.width;
      doc.addImage(logoBase64, 'PNG', pageWidth / 2 - wWidth / 2, pageHeight / 2 - wHeight / 2, wWidth, wHeight);
      doc.restoreGraphicsState();

      // Top Logo (Normal Opacity)
      const hImgWidth = 45;
      const hImgHeight = (imgProps.height * hImgWidth) / imgProps.width;
      doc.addImage(logoBase64, 'PNG', 20, 10, hImgWidth, hImgHeight);
    }

    // Footer
    const footerY = pageHeight - 15;
    doc.setDrawColor(primaryRed[0], primaryRed[1], primaryRed[2]);
    doc.setLineWidth(0.5);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
    
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const footerText1 = "www.mundolarsoluciones.com  |  (57) 305 2200300 - (601) 5206334  |  comercial@mundolarsoluciones.com";
    const footerText2 = "Cr 7 No. 156 - 68 Ed North Point III Bogotá - Colombia";
    
    doc.text(footerText1, pageWidth / 2, footerY, { align: 'center' });
    doc.text(footerText2, pageWidth / 2, footerY + 4, { align: 'center' });
  };

  // 1. Initial Page Header & Logo
  addPageDecorations(doc); // Decorate first page (includes logo)

  // Date
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const date = new Date(quote.created_at);
  const dateStr = `Bogotá, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(dateStr, 20, 58);

  // 2. Client Info
  const clientObj = Array.isArray(quote.clients) ? quote.clients[0] : quote.clients;
  const persona = (clientObj?.contact_person || '').trim();
  const empresa = (clientObj?.full_name || clientObj?.company_name || clientObj?.company || '').trim();

  let currentInfoY = 75;
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(11);

  doc.setFont('helvetica', 'normal');
  doc.text('Señor/a', 20, currentInfoY);
  currentInfoY += 4;

  if (persona && empresa && persona.toUpperCase() !== empresa.toUpperCase()) {
    doc.setFont('helvetica', 'bold');
    doc.text(persona.toUpperCase(), 20, currentInfoY);
    currentInfoY += 4;
    doc.setFont('helvetica', 'bold');
    doc.text(empresa.toUpperCase(), 20, currentInfoY);
    currentInfoY += 6;
  } else {
    const finalName = persona || empresa || 'CLIENTE';
    doc.setFont('helvetica', 'bold');
    doc.text(finalName.toUpperCase(), 20, currentInfoY);
    currentInfoY += 6;
  }

  // 3. Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  const titleText = `Propuesta Comercial No. ${quote.quote_number || formatQuoteId(quote.id)}`;
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, pageWidth - 20 - titleWidth, 95);

  // 4. Intro Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const introText = "De acuerdo a solicitud nos permitimos enviar propuesta comercial, siendo todo un gusto colocar nuestra compañía a su servicio.";
  const splitIntro = doc.splitTextToSize(introText, pageWidth - 40);
  doc.text(splitIntro, 20, 110);

  // 5. Product Table
  const tableData = await Promise.all(items.map(async (item: any) => {
    let imgBase64 = null;
    let format: 'JPEG' | 'PNG' = 'PNG';
    if (item.products?.image_urls) {
      let firstImg = '';
      const rawUrls = item.products.image_urls.trim();
      if (rawUrls.startsWith('[') && rawUrls.endsWith(']')) {
        try {
          const parsed = JSON.parse(rawUrls);
          if (Array.isArray(parsed) && parsed.length > 0) firstImg = parsed[0];
        } catch (e) { firstImg = rawUrls.replace(/[\[\]"]/g, '').split(',')[0].trim(); }
      } else { firstImg = rawUrls.split(',')[0].trim(); }
      if (firstImg) {
        const imgUrl = firstImg.startsWith('http') ? firstImg : `${window.location.origin}${firstImg.startsWith('/') ? '' : '/'}${firstImg}`;
        imgBase64 = await getBase64ImageFromUrl(imgUrl);
        if (imgBase64) format = imgBase64.includes('image/png') ? 'PNG' : 'JPEG';
      }
    }
    return {
      sku: item.products?.sku || 'N/A',
      name: `${item.products?.name || 'Producto'}${item.products?.description ? '\n\n' + item.products.description : ''}`,
      qty: item.quantity.toString(),
      price: `$ ${formatCurrency(item.unit_price)}`, // Added space
      total: `$ ${formatCurrency(item.quantity * item.unit_price)}`, // Added space
      imgBase64,
      format
    };
  }));

  let col4X = 130;
  let col4W = 25;
  let col5W = 25;

  autoTable(doc, {
    startY: 120,
    margin: { top: 65, left: 20, right: 20 },
    head: [['Nº', 'IMAGEN', 'DESCRIPCIÓN', 'CANT', 'VALOR UNIT', 'VALOR TOTAL']],
    body: tableData.map((d: any, index: number) => [(index + 1).toString(), '', d.name, d.qty, d.price, d.total]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center', valign: 'middle', fillColor: false },
    headStyles: { fillColor: primaryRed as [number, number, number], textColor: [255, 255, 255],fontSize:8, fontStyle: 'bold', halign: 'center', lineWidth: 0 },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 30, minCellHeight: 25 }, 2: { halign: 'left', cellWidth: 'auto', cellPadding: { top: 1.5, right: 6, bottom: 1.5, left: 2 } }, 3: { cellWidth: 12 }, 4: { cellWidth: 25 }, 5: { cellWidth: 25 } },
    didDrawCell: (data) => {
      if (data.section === 'head' && data.column.index === 4) {
        col4X = data.cell.x;
        col4W = data.cell.width;
      }
      if (data.section === 'head' && data.column.index === 5) {
        col5W = data.cell.width;
      }

      if (data.section === 'body' && data.column.index === 1) {
        const item = tableData[data.row.index];
        if (item.imgBase64) {
          try {
            const padding = 2;
            const cellW = data.cell.width - padding * 2;
            const cellH = data.cell.height - padding * 2;
            
            const imgProps = doc.getImageProperties(item.imgBase64);
            const imgRatio = imgProps.width / imgProps.height;
            const cellRatio = cellW / cellH;
            
            let finalW = cellW;
            let finalH = cellH;
            let finalX = data.cell.x + padding;
            let finalY = data.cell.y + padding;
            
            // Mantener el aspecto original de la imagen sin deformarla
            if (imgRatio > cellRatio) {
              finalH = cellW / imgRatio;
              finalY += (cellH - finalH) / 2; // Centrado vertical
            } else {
              finalW = cellH * imgRatio;
              finalX += (cellW - finalW) / 2; // Centrado horizontal
            }
            
            doc.addImage(item.imgBase64, item.format, finalX, finalY, finalW, finalH);
          } catch (e) {}
        }
      }
    },
    didDrawPage: (data) => {
      addPageDecorations(doc); // Ensure decoration on table-overflow pages
    }
  });

  // 6. Totals
  const subtotal = quote.subtotal || 0;
  const discountPercentage = quote.discount_percentage || 0;
  const discountAmount = (subtotal * discountPercentage) / 100;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const iva = (subtotalAfterDiscount * 0.19);
  const total = subtotalAfterDiscount + iva;
  const lastTable = (doc as any).lastAutoTable;
  const manualTableX = col4X; 

  const totalsBody: any[] = [
    ['SUBTOTAL', `$ ${formatCurrency(subtotal)}`]
  ];

  if (discountPercentage > 0) {
    totalsBody.push(['DESCUENTO', `-$ ${formatCurrency(discountAmount)}`]);
  }

  totalsBody.push(['IVA 19 %', `$ ${formatCurrency(iva)}`]);
  totalsBody.push(['TOTAL', `$ ${formatCurrency(total)}`]);

  autoTable(doc, {
    startY: lastTable.finalY,
    margin: { left: manualTableX, right: 20 },
    tableWidth: col4W + col5W,
    body: totalsBody,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: textDark as [number, number, number], halign: 'center', valign: 'middle', fillColor: false },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: col4W }, 1: { cellWidth: col5W } }
  });

  const totalsFinalY = (doc as any).lastAutoTable.finalY;

  // 7. Commercial Agreements & Advisor
  let currentY = totalsFinalY + 15;
  if (currentY + 50 > pageHeight - 20) {
    doc.addPage();
    addPageDecorations(doc);
    currentY = 65;
  }

  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.7 }));
  
  const observations = quote.observations || "";
  const DEFAULT_NOTE = `Los equipos, accesorios, repuestos son cotizados de acuerdo a las fichas técnicas y/o recomendaciones brindadas por parte del cliente, por favor revisar las especificaciones técnicas (datasheet) de cada modelo de equipo mencionado antes de adquirirlas, es libertad y responsabilidad propia del mismo.`;
  
  try {
    if (observations.trim().startsWith('{')) {
      const parsed = JSON.parse(observations);
      let hasContent = false;
      const noteText = parsed.general || DEFAULT_NOTE;
      hasContent = true;

      // Draw "NOTA:" in bold
      doc.setFont('helvetica', 'bold');
      doc.text('NOTA: ', 20, currentY);
      const offset = doc.getTextWidth('NOTA: ');
      
      // Calculate padding spaces for the normal text
      doc.setFont('helvetica', 'normal');
      let spacePad = "";
      while (doc.getTextWidth(spacePad) < offset) { spacePad += " "; }

      const splitNote = doc.splitTextToSize(spacePad + noteText, pageWidth - 40);
      doc.text(splitNote, 20, currentY);
      currentY += (splitNote.length * 4) + 5;

      // Restore for Agreements
      doc.restoreGraphicsState();
      doc.setFontSize(9);

      const categories = [ { id: 'venta', label: 'VENTA' }, { id: 'alquiler', label: 'ALQUILER' }, { id: 'mantenimiento', label: 'MANTENIMIENTO' } ];
      categories.forEach(cat => {
        const data = parsed[cat.id];
        if (data && data.enabled && data.text) {
          hasContent = true;
          if (currentY + 30 > pageHeight - 30) {
            doc.addPage();
            addPageDecorations(doc);
            currentY = 65;
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
          const displayLabel = cat.id === 'venta' ? 'SUMINISTRO' : cat.label;
          doc.text(`ACUERDOS COMERCIALES DE ${displayLabel}:`, 20, currentY);
          currentY += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(textDark[0], textDark[1], textDark[2]);
          const split = doc.splitTextToSize(data.text, pageWidth - 40);
          doc.text(split, 20, currentY);
          currentY += (split.length * 4.5) + 8;
        }
      });
      if (!hasContent) {
        doc.text("Sin condiciones comerciales adicionales.", 20, currentY);
        currentY += 10;
      }
    } else {
      // Plain text - treat as Nota disclaimer
      doc.setFont('helvetica', 'bold');
      doc.text('NOTA: ', 20, currentY);
      const offset = doc.getTextWidth('NOTA: ');
      
      doc.setFont('helvetica', 'normal');
      let spacePad = "";
      while (doc.getTextWidth(spacePad) < offset) { spacePad += " "; }
      
      const splitNote = doc.splitTextToSize(spacePad + (observations || "Sin condiciones comerciales adicionales."), pageWidth - 40);
      doc.text(splitNote, 20, currentY);
      currentY += (splitNote.length * 5) + 10;
      doc.restoreGraphicsState();
    }
  } catch (e) {
    // Error parsing - treat as Nota disclaimer
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTA: ', 20, currentY);
    const offset = doc.getTextWidth('NOTA: ');
    
    doc.setFont('helvetica', 'normal');
    let spacePad = "";
    while (doc.getTextWidth(spacePad) < offset) { spacePad += " "; }
    
    const splitNote = doc.splitTextToSize(spacePad + (observations || "Sin condiciones comerciales adicionales."), pageWidth - 40);
    doc.text(splitNote, 20, currentY);
    currentY += (splitNote.length * 5) + 10;
    doc.restoreGraphicsState();
  }

  currentY += 5;
  if (currentY + 30 > pageHeight - 20) {
    doc.addPage();
    addPageDecorations(doc);
    currentY = 65;
  }
  
  const displayRole = (advisor?.role === 'Admin' || advisor?.role === 'Ejecutivo de cuenta' || !advisor?.role) 
    ? 'Ejecutivo de cuenta' 
    : advisor.role;

  doc.setFont('helvetica', 'bold');
  doc.text('Cordialmente,', 20, currentY);
  currentY += 10;
  doc.text(advisor?.full_name || 'Ejecutivo de cuenta', 20, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(displayRole, 20, currentY + 5);

  doc.save(`Cotización_Mundolar_${quote.quote_number || quote.id}.pdf`);
};
