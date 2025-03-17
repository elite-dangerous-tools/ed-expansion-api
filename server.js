const { descargar_estaciones } = require("./src/descargar_estaciones");

const express = require("express");
const app = express();

const port = process.env.PORT || 5000;

// Ruta de inicio
app.get("/", (req, res) => {
    return res.status(200).send({
        message: "¡Bienvenido a la API REST!",
    });
});

app.get("/api/descargar_estaciones", descargar_estaciones);

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

module.exports = app;
