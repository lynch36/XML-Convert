let datosFactura = null;

document.getElementById('xmlFile').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
        const xml = evt.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "application/xml");
        datosFactura = extraerDatos(xmlDoc);
        mostrarDatos(datosFactura);
        document.getElementById('exportButtons').style.display = 'block';
    };
    reader.readAsText(file);
});

function extraerDatos(xmlDoc) {
    const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
    const emisor = xmlDoc.getElementsByTagName('cfdi:Emisor')[0];
    const receptor = xmlDoc.getElementsByTagName('cfdi:Receptor')[0];
    const conceptos = xmlDoc.getElementsByTagName('cfdi:Concepto');

    // Buscar Carta Porte (puede estar en cfdi:Complemento)
    let cartaPorte = null;
    const complementos = xmlDoc.getElementsByTagName('cfdi:Complemento');
    if (complementos.length > 0) {
        // Busca cualquier nodo que termine en :CartaPorte dentro del complemento
        for (let i = 0; i < complementos.length; i++) {
            const hijos = complementos[i].children;
            for (let j = 0; j < hijos.length; j++) {
                if (hijos[j].nodeName.endsWith(':CartaPorte')) {
                    cartaPorte = hijos[j];
                    break;
                }
            }
            if (cartaPorte) break;
        }
    }

    // Extrae algunos datos básicos de Carta Porte si existe
    let datosCartaPorte = null;
    if (cartaPorte) {
        datosCartaPorte = {
            version: cartaPorte.getAttribute('Version') || cartaPorte.getAttribute('version') || '',
            totalDistRec: cartaPorte.getAttribute('TotalDistRec') || cartaPorte.getAttribute('totalDistRec') || '',
            ubicaciones: [],
            mercancias: []
        };

        // Ubicaciones
        const ubicaciones = cartaPorte.getElementsByTagName('cartaporte31:Ubicacion');
        for (let i = 0; i < ubicaciones.length; i++) {
            datosCartaPorte.ubicaciones.push({
                tipo: ubicaciones[i].getAttribute('TipoUbicacion') || '',
                rfc: ubicaciones[i].getAttribute('RFCRemitenteDestinatario') || '',
                nombre: ubicaciones[i].getAttribute('NombreRemitenteDestinatario') || '',
                fechaHora: ubicaciones[i].getAttribute('FechaHoraSalidaLlegada') || ''
            });
        }

        // Mercancías
        const mercancias = cartaPorte.getElementsByTagName('cartaporte31:Mercancia');
        for (let i = 0; i < mercancias.length; i++) {
            datosCartaPorte.mercancias.push({
                descripcion: mercancias[i].getAttribute('Descripcion') || '',
                cantidad: mercancias[i].getAttribute('Cantidad') || '',
                clave: mercancias[i].getAttribute('ClaveProdServCP') || ''
            });
        }
    }

    return {
        generales: {
            version: comprobante?.getAttribute('Version') || '',
            folio: comprobante?.getAttribute('Folio') || '',
            fecha: comprobante?.getAttribute('Fecha') || '',
            formaPago: comprobante?.getAttribute('FormaPago') || '',
            metodoPago: comprobante?.getAttribute('MetodoPago') || '',
            moneda: comprobante?.getAttribute('Moneda') || '',
            subTotal: comprobante?.getAttribute('SubTotal') || '',
            total: comprobante?.getAttribute('Total') || '',
            tipoComprobante: comprobante?.getAttribute('TipoDeComprobante') || '',
            lugarExpedicion: comprobante?.getAttribute('LugarExpedicion') || '',
        },
        emisor: {
            rfc: emisor?.getAttribute('Rfc') || '',
            nombre: emisor?.getAttribute('Nombre') || '',
            regimen: emisor?.getAttribute('RegimenFiscal') || ''
        },
        receptor: {
            rfc: receptor?.getAttribute('Rfc') || '',
            nombre: receptor?.getAttribute('Nombre') || '',
            usoCFDI: receptor?.getAttribute('UsoCFDI') || ''
        },
        conceptos: Array.from(conceptos).map(c => ({
            Descripcion: c.getAttribute('Descripcion') || '',
            Cantidad: c.getAttribute('Cantidad') || '',
            ValorUnitario: c.getAttribute('ValorUnitario') || '',
            Importe: c.getAttribute('Importe') || ''
        })),
        cartaPorte: datosCartaPorte // Puede ser null si no hay complemento
    };
}

function mostrarDatos(datos) {
    let html = `
    <h2>Datos Generales</h2>
    <table>
      <tr><th>Versión</th><td>${datos.generales.version || ''}</td></tr>
      <tr><th>Folio</th><td>${datos.generales.folio || ''}</td></tr>
      <tr><th>Fecha</th><td>${datos.generales.fecha || ''}</td></tr>
      <tr><th>Forma de Pago</th><td>${datos.generales.formaPago || ''}</td></tr>
      <tr><th>Método de Pago</th><td>${datos.generales.metodoPago || ''}</td></tr>
      <tr><th>Moneda</th><td>${datos.generales.moneda || ''}</td></tr>
      <tr><th>SubTotal</th><td>${datos.generales.subTotal || ''}</td></tr>
      <tr><th>Total</th><td>${datos.generales.total || ''}</td></tr>
      <tr><th>Tipo de Comprobante</th><td>${datos.generales.tipoComprobante || ''}</td></tr>
      <tr><th>Lugar de Expedición</th><td>${datos.generales.lugarExpedicion || ''}</td></tr>
    </table>
    <h2>Emisor</h2>
    <table>
      <tr><th>RFC</th><td>${datos.emisor.rfc || ''}</td></tr>
      <tr><th>Nombre</th><td>${datos.emisor.nombre || ''}</td></tr>
      <tr><th>Régimen Fiscal</th><td>${datos.emisor.regimen || ''}</td></tr>
    </table>
    <h2>Receptor</h2>
    <table>
      <tr><th>RFC</th><td>${datos.receptor.rfc || ''}</td></tr>
      <tr><th>Nombre</th><td>${datos.receptor.nombre || ''}</td></tr>
      <tr><th>Uso CFDI</th><td>${datos.receptor.usoCFDI || ''}</td></tr>
    </table>
    <h2>Conceptos</h2>
    <table>
      <tr>
        <th>Descripción</th>
        <th>Cantidad</th>
        <th>Valor Unitario</th>
        <th>Importe</th>
      </tr>
      ${datos.conceptos.map(c => `
        <tr>
          <td>${c.Descripcion || ''}</td>
          <td>${c.Cantidad || ''}</td>
          <td>${c.ValorUnitario || ''}</td>
          <td>${c.Importe || ''}</td>
        </tr>
      `).join('')}
    </table>
    ${datos.cartaPorte ? `
      <h2>Carta Porte</h2>
      <table>
        <tr><th>Versión</th><td>${datos.cartaPorte.version}</td></tr>
        <tr><th>Total Distancia Recorrida</th><td>${datos.cartaPorte.totalDistRec}</td></tr>
      </table>
      <h3>Ubicaciones</h3>
      <table>
        <tr><th>Tipo</th><th>RFC</th><th>Nombre</th><th>Fecha/Hora</th></tr>
        ${datos.cartaPorte.ubicaciones.map(u => `
          <tr>
            <td>${u.tipo}</td>
            <td>${u.rfc}</td>
            <td>${u.nombre}</td>
            <td>${u.fechaHora}</td>
          </tr>
        `).join('')}
      </table>
      <h3>Mercancías</h3>
      <table>
        <tr><th>Descripción</th><th>Cantidad</th><th>Clave</th></tr>
        ${datos.cartaPorte.mercancias.map(m => `
          <tr>
            <td>${m.descripcion}</td>
            <td>${m.cantidad}</td>
            <td>${m.clave}</td>
          </tr>
        `).join('')}
      </table>
    ` : ''}
  `;
    document.getElementById('facturaInfo').innerHTML = html;
}

function exportToExcel() {
    if (!datosFactura) {
        alert('No hay datos para exportar.');
        return;
    }

    // Preparamos los datos para Excel
    const generales = datosFactura.generales;
    const emisor = datosFactura.emisor;
    const receptor = datosFactura.receptor;
    const conceptos = datosFactura.conceptos;

    // Hoja 1: Datos generales
    const hojaGenerales = [
        ["Campo", "Valor"],
        ["Versión", generales.version],
        ["Folio", generales.folio],
        ["Fecha", generales.fecha],
        ["Forma de Pago", generales.formaPago],
        ["Método de Pago", generales.metodoPago],
        ["Moneda", generales.moneda],
        ["SubTotal", generales.subTotal],
        ["Total", generales.total],
        ["Tipo de Comprobante", generales.tipoComprobante],
        ["Lugar de Expedición", generales.lugarExpedicion]
    ];

    // Hoja 2: Emisor y Receptor
    const hojaEmisorReceptor = [
        ["Tipo", "RFC", "Nombre", "Régimen/ Uso CFDI"],
        ["Emisor", emisor.rfc, emisor.nombre, emisor.regimen],
        ["Receptor", receptor.rfc, receptor.nombre, receptor.usoCFDI]
    ];

    // Hoja 3: Conceptos
    const hojaConceptos = [
        ["Descripción", "Cantidad", "Valor Unitario", "Importe"],
        ...conceptos.map(c => [
            c.Descripcion, c.Cantidad, c.ValorUnitario, c.Importe
        ])
    ];

    // Crear libro y hojas
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hojaGenerales), "Generales");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hojaEmisorReceptor), "Emisor y Receptor");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hojaConceptos), "Conceptos");

    // Descargar archivo
    XLSX.writeFile(wb, "factura_cfdi.xlsx");
}

function exportToPDF() {
    const facturaDiv = document.getElementById('facturaInfo');
    if (!facturaDiv.innerHTML.trim()) {
        alert('No hay datos para exportar.');
        return;
    }

    html2canvas(facturaDiv).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        // Ajusta el tamaño de la imagen al ancho de la página
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 40;
        const imgHeight = canvas.height * imgWidth / canvas.width;

        pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
        pdf.save('factura_cfdi.pdf');
    });
}