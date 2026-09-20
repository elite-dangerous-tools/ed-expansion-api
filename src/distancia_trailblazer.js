const { recuperarBusqueda } = require("./spansh");

exports.distancia_trailblazer = async (req, res) => {
    try {
        const { sistema } = req.query;

        const parametros = {
            filters: { name: { value: "Trailblazer" }, type: { value: ["Planetary Outpost", "Mega ship"] } },
            sort: [{ distance: { direction: "asc" } }],
            // size y page los fija recuperarBusqueda (paginacion interna)
            reference_system: sistema
        };

        // Adelgazamos cada página nada más recibirla: solo conservamos los 4
        // campos que devolvemos (antes se acumulaban todas las páginas crudas)
        const procesarPagina = (resultados) => {
            return resultados.map(fila => ({
                sistema: fila.system_name,
                estacion: fila.name,
                distanciaestacion: fila.distance_to_arrival,
                distanciasistema: fila.distance
            }));
        };

        let lista_trailblazers = await recuperarBusqueda(parametros, "stations", procesarPagina);

        if (!lista_trailblazers) {
            return res.status(502).json({ message: "Fallo crítico al buscar Trailblazers" });
        }

        res.json(lista_trailblazers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Fallo crítico al buscar Trailblazers" });
    }
};
