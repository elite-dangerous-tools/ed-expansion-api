const { descargar_sistemas } = require("./src/descargar_sistemas");
const { descargar_estaciones } = require("./src/descargar_estaciones");
const { sistemas_alcance } = require("./src/sistemas_alcance");
const { estaciones_producto } = require("./src/estaciones_producto");
const { productos } = require("./src/productos");
const { distancia_trailblazer } = require("./src/distancia_trailblazer");

const cron = require("node-cron");
const cors = require("cors");
const express = require("express");
const app = express();

const port = process.env.PORT || 5000;

// Permitimos CORS de sitios nuestros
const allowedOrigins = ["http://localhost:4000", "https://storm-seekers.gitlab.io"];
app.use(cors({ origin: allowedOrigins }));

// Programa una tarea para que se ejecute todos los días a las 7 a.m.
cron.schedule(
    "0 7 * * *",
    () => {
        descargar_estaciones();
    },
    {
        timezone: "Europe/Madrid"
    }
);

// Ruta de inicio
app.get("/", (req, res) => {
    return res.status(200).send({
        message: "¡Bienvenido a la API REST!"
    });
});

app.get("/api/descargar_sistemas", descargar_sistemas);
app.get("/api/descargar_estaciones", descargar_estaciones);

app.get("/api/sistemas_alcance", sistemas_alcance);
app.get("/api/estaciones_producto", estaciones_producto);
app.get("/api/productos", productos);
app.get("/api/distancia_trailblazer", distancia_trailblazer);

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

module.exports = app;
