const { descargar_sistemas, extraer_sistemas, descargar_estaciones, extraer_estaciones } = require("./descargar");

const express = require("express");
const app = express();

const port = process.env.PORT || 5000;

// Ruta de inicio
app.get("/", (req, res) => {
    return res.status(200).send({
        message: "¡Bienvenido a la API REST!",
    });
});

app.get("/api/descargar_sistemas", descargar_sistemas);
app.get("/api/extraer_sistemas", extraer_sistemas);

app.get("/api/descargar_estaciones", descargar_estaciones);
app.get("/api/extraer_estaciones", extraer_estaciones);

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

module.exports = app;
