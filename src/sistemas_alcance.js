const { recuperarBusqueda } = require("./spansh");

exports.sistemas_alcance = async (req, res) => {
    try {
        const { distancia, sistema } = req.query;

        // La distancia debe ser un número entre 0 y 100. Excluye no numéricos,
        // negativos y NaN
        const distanciaNumero = Number(distancia);
        if (!Number.isFinite(distanciaNumero) || distanciaNumero < 0 || distanciaNumero > 100) {
            res.status(400).json({ message: "La distancia debe ser un número entre 0 y 100" });
            return;
        }

        const parametros = {
            filters: { distance: { min: 0, max: distanciaNumero } },
            // sort: [],
            size: 500,
            page: 0,
            reference_system: sistema
        };


        // Adelgazamos cada página nada más recibirla, antes de pedir la
        // siguiente (antes se acumulaban todas las páginas crudas en RAM)
        const procesarPaginaSistemas = (resultados) => {
            resultados.forEach(sistema => {
                delete sistema.synthesis_recipes;
                delete sistema.power_conflicts;
                delete sistema.stations;
                delete sistema.minor_faction_presences;
            });
            return resultados;
        };

        const procesarPaginaCuerpos = (resultados) => {
            resultados.forEach(cuerpo => {
                delete cuerpo.materials;
                delete cuerpo.parents;
                delete cuerpo.synthesis_recipes;
            });
            return resultados;
        };

        let resultadoSistemas = await recuperarBusqueda(parametros, 'systems', procesarPaginaSistemas);
        let resultadoCuerpos = await recuperarBusqueda(parametros, 'bodies', procesarPaginaCuerpos);

        // Índice O(B) por sistema: evita el .filter() O(S×B) dentro del bucle
        // (antes se recorrian TODOS los cuerpos por cada sistema)
        const cuerposPorSistema = new Map();
        resultadoCuerpos.forEach(cuerpo => {
            let lista = cuerposPorSistema.get(cuerpo.system_id64);
            if (!lista) {
                lista = [];
                cuerposPorSistema.set(cuerpo.system_id64, lista);
            }
            lista.push(cuerpo);
        });

        resultadoSistemas.forEach(sistema => {
            const cuerpos = cuerposPorSistema.get(sistema.id64) || [];

            delete sistema.bodies; // No tienen tanta información
            sistema.bodies = cuerpos;
        });

        res.json(resultadoSistemas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Fallo crítico al buscar sistemas al alcance" });
    }
};
