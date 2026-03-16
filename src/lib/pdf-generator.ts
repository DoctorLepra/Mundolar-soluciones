
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

const getBase64ImageFromUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
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
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 20, 10, 50, 25);
  }

  // Date
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const date = new Date(quote.created_at);
  const dateStr = `Bogotá, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(dateStr, 20, 45);

  // 2. Client Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const clientName = quote.clients?.company_name || quote.clients?.full_name || 'Cliente';
  doc.text(clientName.toUpperCase(), 20, 65);
  
  doc.setFont('helvetica', 'normal');
  const contactPerson = quote.clients?.contact_person ? `Atn: ${quote.clients.contact_person}` : '';
  if (contactPerson) {
    doc.text(contactPerson, 20, 71);
  }

  // 3. Title (Right aligned, Red)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  const titleText = `Propuesta Comercial No. ${quote.quote_number || formatQuoteId(quote.id)}`;
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, pageWidth - 20 - titleWidth, 85);

  // 4. Intro Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const introText = "De acuerdo a solicitud nos permitimos enviar propuesta comercial, siendo todo un gusto colocar nuestra compañía a su servicio.";
  const splitIntro = doc.splitTextToSize(introText, pageWidth - 40);
  doc.text(splitIntro, 20, 100);

  // 5. Product Table
  const tableData = await Promise.all(items.map(async (item: any) => {
    let imgBase64 = null;
    if (item.products?.image_urls) {
      const firstImg = item.products.image_urls.split(',')[0].trim();
      if (firstImg) {
        imgBase64 = await getBase64ImageFromUrl(firstImg);
      }
    }

    return {
      sku: item.products?.sku || 'N/A',
      name: `${item.products?.name || 'Producto'}${item.products?.description ? '\n' + item.products.description : ''}`,
      qty: item.quantity.toString(),
      price: `$${formatCurrency(item.unit_price)}`,
      total: `$${formatCurrency(item.quantity * item.unit_price)}`,
      imgBase64
    };
  }));

  autoTable(doc, {
    startY: 110,
    head: [['REF', 'IMAGEN', 'DESCRIPCIÓN', 'CANT', 'VALOR UNIT', 'VALOR TOTAL']],
    body: tableData.map((d: any) => [d.sku, '', d.name, d.qty, d.price, d.total]),
    theme: 'grid',
    headStyles: {
      fillColor: primaryRed as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { halign: 'center', cellWidth: 30, minCellHeight: 25 },
      2: { cellWidth: 'auto' },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'right', cellWidth: 30 }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const item = tableData[data.row.index];
        if (item.imgBase64) {
          const padding = 2;
          const imgWidth = data.cell.width - padding * 2;
          const imgHeight = data.cell.height - padding * 2;
          doc.addImage(item.imgBase64, 'JPEG', data.cell.x + padding, data.cell.y + padding, imgWidth, imgHeight);
        }
      }
    },
    // Watermark
    didDrawPage: (data) => {
      if (logoBase64) {
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
        doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 40, pageHeight / 2 - 40, 80, 40);
        doc.restoreGraphicsState();
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
    }
  });

  // 6. Totals
  const finalY = (doc as any).lastAutoTable.finalY + 5;
  const subtotal = quote.subtotal || 0;
  const iva = (subtotal * 0.19);
  const total = quote.total_amount || 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  
  const totalX = pageWidth - 20;
  doc.text('SUBTOTAL:', totalX - 50, finalY);
  doc.text(`$${formatCurrency(subtotal)}`, totalX, finalY, { align: 'right' });
  
  doc.text('IVA 19%:', totalX - 50, finalY + 5);
  doc.text(`$${formatCurrency(iva)}`, totalX, finalY + 5, { align: 'right' });
  
  doc.setTextColor(primaryRed[0], primaryRed[1], primaryRed[2]);
  doc.setFontSize(12);
  doc.text('TOTAL:', totalX - 50, finalY + 12);
  doc.text(`$${formatCurrency(total)}`, totalX, finalY + 12, { align: 'right' });

  // 7. Commercial Conditions & Advisor
  let currentY = finalY + 25;
  if (currentY + 50 > pageHeight - 20) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('CONDICIONES COMERCIALES:', 20, currentY);
  
  doc.setFont('helvetica', 'normal');
  const conditions = quote.observations || "Sin condiciones comerciales adicionales.";
  const splitConditions = doc.splitTextToSize(conditions, pageWidth - 40);
  doc.text(splitConditions, 20, currentY + 6);

  currentY += 15 + (splitConditions.length * 5);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Cordialmente,', 20, currentY);
  currentY += 10;
  doc.text(advisor?.full_name || 'Asesor Comercial', 20, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(advisor?.role || 'Mundolar Soluciones', 20, currentY + 5);

  doc.save(`Cotizacion_${quote.quote_number || quote.id}.pdf`);
};
