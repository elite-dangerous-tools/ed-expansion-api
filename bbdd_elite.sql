
CREATE TABLE public.productos (
	id varchar NOT NULL,
	"name" varchar NOT NULL,
	nombre varchar NULL,
	CONSTRAINT productos_pk PRIMARY KEY (id),
	CONSTRAINT productos_unique UNIQUE (name)
);



CREATE TABLE public.sistemas (
	systemid64 int8 NOT NULL,
	nombre varchar NOT NULL,
	x float8 NOT NULL,
	y float8 NOT NULL,
	z float8 NOT NULL,
	CONSTRAINT sistemas_pk PRIMARY KEY (systemid64)
);
CREATE INDEX sistemas_nombre_idx ON public.sistemas USING btree (nombre);
CREATE INDEX sistemas_x_idx ON public.sistemas USING btree (x, y, z);



CREATE TABLE public.estaciones (
	id int8 NOT NULL,
	"name" varchar NOT NULL,
	distance int4 NOT NULL,
	systemid64 int8 NOT NULL,
	"type" varchar NOT NULL,
	CONSTRAINT estaciones_pk PRIMARY KEY (id),
	CONSTRAINT estaciones_sistemas_fk FOREIGN KEY (systemid64) REFERENCES public.sistemas(systemid64) ON DELETE SET NULL ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED
);



CREATE TABLE public.producto_estacion (
	id_producto varchar NOT NULL,
	id_estacion int8 NOT NULL,
	stock int8 DEFAULT 0 NOT NULL,
	sellprice float8 NOT NULL,
	CONSTRAINT producto_estacion_estaciones_fk FOREIGN KEY (id_estacion) REFERENCES public.estaciones(id) ON DELETE SET NULL ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED,
	CONSTRAINT producto_estacion_productos_fk FOREIGN KEY (id_producto) REFERENCES public.productos(id) ON DELETE SET NULL ON UPDATE SET NULL DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX producto_estacion_id_producto_idx ON public.producto_estacion USING btree (id_producto, id_estacion);




CREATE MATERIALIZED VIEW vista_productos AS
SELECT p.id, p.name, coalesce(p.nombre, p.name) as nombre, pe.max_stock, pe.avg_stock
FROM productos p
JOIN (
    SELECT id_producto, 
           MAX(stock) AS max_stock,
           ROUND(AVG(stock), 2) AS avg_stock
    FROM producto_estacion
    GROUP BY id_producto
) pe ON p.id = pe.id_producto;
