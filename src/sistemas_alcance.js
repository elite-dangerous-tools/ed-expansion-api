const { recuperarBusqueda } = require("./spansh");

exports.sistemas_alcance = async (req, res) => {
    try {
        const { distancia, sistema } = req.query;

        if (distancia > 100) {
            // No permitimos tanta distancia
            res.json([]);
            return;
        }

        const parametros = {
            filters: { distance: { min: 0, max: distancia } },
            // sort: [],
            size: 500,
            page: 0,
            reference_system: sistema
        };


        let resultadoSistemas = await recuperarBusqueda(parametros, 'systems');
        let resultadoCuerpos = await recuperarBusqueda(parametros, 'bodies');
        
        resultadoSistemas.forEach(sistema => {
            delete sistema.synthesis_recipes;
            delete sistema.power_conflicts;
            delete sistema.stations;
            delete sistema.minor_faction_presences;

            let cuerpos = resultadoCuerpos.filter(c => c.system_id64 == sistema.id64);
            cuerpos.forEach(cuerpo => {
                delete cuerpo.materials;
                delete cuerpo.parents;
                delete cuerpo.synthesis_recipes;
            });

            delete sistema.bodies; // No tienen tanta información
            sistema.bodies = cuerpos;
        });

        res.json(resultadoSistemas);
    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar sistemas al alcance" });
    }
};
