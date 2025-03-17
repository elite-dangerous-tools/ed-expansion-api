const express = require("express");
const app = express();

const port = process.env.PORT || 5000;

// Ruta de inicio
app.get("/", (req, res) => {
    return res.status(200).send({
        message: "¡Bienvenido a la API REST!",
    });
});

// Ruta de ejemplo
app.get('/api/saludo', (req, res) => {
    res.json({ message: '¡Hola, mundo!' });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});

module.exports = app;
