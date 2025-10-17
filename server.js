const { sistemas_alcance } = require("./src/sistemas_alcance");
const { productos } = require("./src/productos");
const { distancia_trailblazer } = require("./src/distancia_trailblazer");
const { estaciones } = require("./src/estaciones");

const cron = require("node-cron");
const cors = require("cors");
const express = require("express");
const app = express();

const port = process.env.PORT || 5000;

// Permitimos CORS de sitios nuestros
const allowedOrigins = ["http://localhost:4000", "https://storm-seekers.gitlab.io"];
app.use(cors({ origin: allowedOrigins }));

// Programa una tarea para que se ejecute todos los días a las 6 a.m.
// cron.schedule(
//     "0 6 * * *",
//     () => {
//         descargar_estaciones(undefined, undefined, true);
//     },
//     {
//         timezone: "Europe/Madrid"
//     }
// );

// Ruta de inicio
app.get("/", (req, res) => {
    return res.status(200).send({
        message: "¡Bienvenido a la API REST!"
    });
});

app.get("/api/sistemas_alcance", sistemas_alcance);
app.get("/api/distancia_trailblazer", distancia_trailblazer);
app.get("/api/productos", productos);
app.get("/api/estaciones", estaciones);


app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

module.exports = app;
