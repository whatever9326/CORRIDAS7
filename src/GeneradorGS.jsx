
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function GeneradorGS() {
  const [corridas, setCorridas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [resultado, setResultado] = useState([]);
  const [faltantes, setFaltantes] = useState([]);

  useEffect(() => {
    const fetchSheet = async () => {
      const url = 'https://docs.google.com/spreadsheets/d/1HfJEFXNObD8gIaFiFb7AftHeIxuBduj9YB_TkJZpB2c/gviz/tq?tqx=out:csv';
      const res = await fetch(url);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const wb = await blob.arrayBuffer();
      const data = XLSX.read(wb, { type: 'array' });
      const sheet = XLSX.utils.sheet_to_json(data.Sheets[data.SheetNames[0]]);
      setCorridas(sheet);
    };
    fetchSheet();
  }, []);

  const handlePedidosUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      setPedidos(json);
    };
    reader.readAsBinaryString(file);
  };

  const generarSKUs = () => {
    const tallas = [23, 24, 25, 26, 27, 28, 29, 30];
    const resumen = {};
    const noEncontrados = [];

    pedidos.forEach(pedido => {
      const pedidoNorm = String(pedido.PEDIDO).trim().toUpperCase();
      const modeloNorm = String(pedido.MODELO).trim().toUpperCase();
      const colorNorm = String(pedido.COLOR).trim().toUpperCase();

      const fila = corridas.find(row =>
        String(row.PEDIDO).trim().toUpperCase() === pedidoNorm &&
        String(row.MODELO).trim().toUpperCase() === modeloNorm &&
        String(row.COLOR).trim().toUpperCase() === colorNorm
      );

      if (!fila) {
        noEncontrados.push(`${pedido.PEDIDO} - ${pedido.MODELO} - ${pedido.COLOR}`);
        return;
      }

      const cajas = Number(pedido.CAJAS || 0);
      tallas.forEach(talla => {
        const cantidad = parseInt(fila[talla] === '-' ? 0 : fila[talla] || 0);
        const sku = `${pedido.MODELO}-${pedido.COLOR}-${talla}-MX`;
        const total = cantidad * cajas;
        if (total > 0) {
          resumen[sku] = (resumen[sku] || 0) + total;
        }
      });
    });

    const resultadoFinal = Object.entries(resumen).map(([sku, cantidad]) => ({ sku, cantidad }));
    setResultado(resultadoFinal);
    setFaltantes(noEncontrados);
  };

  const exportarExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(resultado);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resultado");
    XLSX.writeFile(workbook, "skus_pedidos_generados.xlsx");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Generador de SKUs con hoja de Google Sheets</h2>
      <p><strong>Corridas cargadas automáticamente ✅</strong></p>

      <p><strong>Subir archivo de pedidos (.xlsx)</strong></p>
      <input type="file" accept=".xlsx" onChange={handlePedidosUpload} />
      <button onClick={generarSKUs} style={{ marginTop: 10 }}>Generar SKUs</button>

      {faltantes.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4>❗ Combinaciones no encontradas:</h4>
          <ul>
            {faltantes.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}

      {resultado.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Resultado</h3>
          <table border="1" cellPadding="5">
            <thead>
              <tr><th>SKU</th><th>Cantidad</th></tr>
            </thead>
            <tbody>
              {resultado.map((r, i) => (
                <tr key={i}><td>{r.sku}</td><td>{r.cantidad}</td></tr>
              ))}
            </tbody>
          </table>
          <button onClick={exportarExcel} style={{ marginTop: 10 }}>Exportar Excel</button>
        </div>
      )}
    </div>
  );
}
