const { recuperarBusqueda } = require("./spansh");

exports.distancia_trailblazer = async (req, res) => {
    try {
        const { sistema } = req.query;

        const parametros = {
            filters: { name: { value: "Trailblazer" }, type: { value: ["Planetary Outpost", "Mega ship"] } },
            sort: [{ distance: { direction: "asc" } }],
            size: 100,
            page: 0,
            reference_system: sistema
        };

        let resultado = await recuperarBusqueda(parametros, "stations");

        let lista_trailblazers = [];

        resultado.forEach(fila => {
            lista_trailblazers.push({
                sistema: fila.system_name,
                estacion: fila.name,
                distanciaestacion: fila.distance_to_arrival,
                distanciasistema: fila.distance
            });
        });

        res.json(lista_trailblazers);
    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar Trailblazers" });
    }
};
