
const { descargar_sistemas } = require("./src/descargar_sistemas");
const { sistemas_alcance } = require("./src/sistemas_alcance");

const cors = require('cors');
const express = require("express");
const app = express();

const port = process.env.PORT || 5000;


// Permitimos CORS de sitios nuestros
const allowedOrigins = ['http://localhost:4000', 'https://storm-seekers.gitlab.io'];
app.use(cors({ origin: allowedOrigins }));


// Ruta de inicio
app.get("/", (req, res) => {
    return res.status(200).send({
        message: "¡Bienvenido a la API REST!",
    });
});

app.get("/api/descargar_sistemas", descargar_sistemas);
app.get("/api/sistemas_alcance", sistemas_alcance);

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

module.exports = app;
