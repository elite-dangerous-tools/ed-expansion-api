
const { Client } = require("pg");
const { db_config } = require("./db_config");

const client = new Client(db_config);
client.connect();
client.setTypeParser(20, val => parseInt(val));  // Para BIGINT



async function buscarEstacionesComprar(sistema, distancia) {
    const distanciaOrigen = parseInt(distancia);
    
    const query = `
        with sistema_origen as ( select * from sistemas WHERE nombre = 'Arietis Sector PN-T b3-2' ),
        sistema_destino as (
            SELECT s.nombre, s.systemid64 as id_sistema,
                    sqrt(pow(s.x - o.x, 2) + pow(s.y - o.y, 2) + pow(s.z - o.z, 2)) AS distancia
                FROM sistemas s
                JOIN sistema_origen o ON 
                    s.x BETWEEN (o.x - ${distanciaOrigen}) AND (o.x + ${distanciaOrigen})
                    AND s.y BETWEEN (o.y - ${distanciaOrigen}) AND (o.y + ${distanciaOrigen})
                    AND s.z BETWEEN (o.z - ${distanciaOrigen}) AND (o.z + ${distanciaOrigen})
        )
        select sd.nombre as sistema, sd.distancia as distancia_al, e."name" as estacion_compra, pe.id_producto, pe.buyprice, pe.stock
        from sistema_destino sd
        join estaciones e on e.systemid64 = sd.id_sistema
        join producto_estacion pe on pe.id_estacion = e.id
        where sd.distancia <= ${distanciaOrigen}
        and sd.distancia > 0
        and pe.stock > 0
    `;

    const { rows } = await client.query(query);
    
    return rows;
}

async function buscarEstacionesVender(sistema) {
    const query = `
        select e.name as estacion_venta, pe.id_producto, pe.demand, pe.sellprice
        from sistemas s
        join estaciones e on e.systemid64 = s.systemid64 
        join producto_estacion pe on pe.id_estacion = e.id 
        where nombre = '${sistema}'
        and pe.demand > 0
    `;

    const { rows } = await client.query(query);
    
    return rows;
}

exports.venta_beneficio = async (req, res) => {
    try {
        const { distancia, sistema } = req.query;

        if (distancia > 100) {
            // No permitimos tanta distancia
            res.json([]);
            return;
        }

        let estaciones_comprar = await buscarEstacionesComprar(sistema, distancia);
        let estaciones_vender = await buscarEstacionesVender(sistema);

        let lista = [];
        
        estaciones_vender.forEach(venta => {
            const compras = estaciones_comprar.filter(compra => compra.id_producto == venta.id_producto && venta.sellprice > compra.buyprice);

            compras.forEach(compra => {
                const beneficio = ((venta.sellprice / compra.buyprice) * 100) - 100;
                let fila = {
                    ...venta,
                    ...compra,
                    beneficio: beneficio
                }
                lista.push(fila);
            });

        });

        res.json(lista);

    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar sistemas al alcance" });
    }
};
