/* eslint-disable no-undef */
// Importar los módulos necesarios
import express from "express";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { config } from "dotenv";
import cors from "cors"; // Importar cors
import path from "path";
import { fileURLToPath } from "url";

// Obtener la ruta del archivo actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // Obtener el directorio del archivo

// Cargar el archivo .env desde la ruta deseada
config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const port = 3001;

// Habilitar CORS para todas las solicitudes
app.use(cors());

// Middleware para parsear el cuerpo de las solicitudes en formato JSON
app.use(express.json());

app.get("/sheets", async (req, res) => {
  try {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(
      "1vztVxZ9EZxF5ZfwhqLeuGhmYtBmRMY0qyT_PhH2pdGc",
      serviceAccountAuth
    );
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0]; // Suponiendo que el stock está en la primera hoja
    const rows = await sheet.getRows();

    const getRows = rows.map((row) => {
      return row._rawData;
    });

    res.send({ getRows });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error accediendo a la hoja de cálculo");
  }
});

app.post("/sheets/add", async (req, res) => {
  const { items, totalPrice, space } = req.body;
  try {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(
      process.env.GOOGLE_SPREADSHEET_ID,
      serviceAccountAuth
    );
    await doc.loadInfo();

    // Hoja para agregar las ventas
    const salesSheet = doc.sheetsByIndex[1];
    const rows = await salesSheet.getRows();

    // Hoja donde está el stock
    const stockSheet = doc.sheetsByIndex[0];
    const stockRows = await stockSheet.getRows();

    // Utiliza el número de fila para obtener el nuevo ID
    const newId = rows.length + 1;

    // Unir los productos en un solo string y calcular el precio total
    const productDescriptions = items
      .map(({ productName, quantity }) => `(${quantity}) ${productName}`)
      .join(", ");

    const spaceNumber = space.split(" ")[1];

    items.forEach(({ productName, quantity }) => {
      const stockRow = stockRows.find(
        (row) => row.get("Nombre del Producto") === productName
      );

      if (stockRow._rawData[spaceNumber]) {
        const currentStock = parseInt(stockRow._rawData[spaceNumber]);
        const newStock = currentStock - quantity;

        if (newStock >= 0) {
          stockRows[stockRow._rowNumber - 2].set(
            `Stock ${spaceNumber}`,
            newStock
          ); // Actualizar el stock en la fila
          const soldUnits =
            stockRows[stockRow._rowNumber - 2].get("Unidades vendidas");
          stockRows[stockRow._rowNumber - 2].set(
            "Unidades vendidas",
            parseInt(soldUnits) + quantity
          ); // Actualizar el stock en la fila
          const price = parseFloat(
            stockRows[stockRow._rowNumber - 2]
              .get("Precio de Venta")
              .replace("$", "")
              .replace(".", "") // Elimina separadores de miles
              .replace(",", ".") // Convierte la coma decimal a punto
          );

          const gained = parseFloat(
            stockRows[stockRow._rowNumber - 2]
              .get("Dinero obtenido")
              .replace("$", "")
              .replace(".", "") // Elimina separadores de miles
              .replace(",", ".") // Convierte la coma decimal a punto
          );

          const totalGained = gained + price * quantity;

          // Formatear con separador de miles y decimales correctos
          const formattedTotalGained = totalGained
            .toFixed(2) // Asegura dos decimales
            .replace(".", ",") // Cambia el punto decimal a coma
            .replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Añade separador de miles con punto

          stockRows[stockRow._rowNumber - 2].set(
            "Dinero obtenido",
            "$" + formattedTotalGained
          );

          stockRows[stockRow._rowNumber - 2].save(); // Guardar la fila actualizada
        } else {
          console.warn(`No hay suficiente stock para ${productName}`);
        }
      } else {
        console.warn(`Producto ${productName} no encontrado en el stock`);
      }
    });

    // Agregar una nueva fila en la hoja de ventas
    await salesSheet.addRow({
      ID: newId,
      Productos: productDescriptions,
      Precio: totalPrice,
      Espacio: space,
      Entregado: "checkbox",
    });

    res.status(200).send({ newId });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send(
        "Error al agregar una fila en la hoja de cálculo o actualizar el stock"
      );
  }
});

const keepServerAlive = () => {
  const url = "https://buffet-2kis.onrender.com/sheets"; // URL de tu servidor Render
  const interval = 780000; // Intervalo de 13 minutos

  const reloadWebsite = async () => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(
          `Reloaded at ${new Date().toISOString()}: Status Code ${
            response.status
          }`
        );
      } else {
        throw new Error(`Status Code ${response.status}`);
      }
    } catch (error) {
      console.error(
        `Error reloading at ${new Date().toISOString()}: ${error.message}`
      );
    }
  };

  setInterval(reloadWebsite, interval);
};

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
  keepServerAlive();
});
