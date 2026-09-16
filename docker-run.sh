
read -p "¿Quiere recompilar la imagen (o reiniciarla)? s/N: " resp

if [ "$resp" = "s" ] || [ "$resp" = "S" ]; then
    # docker kill ed-colonizacion-api
    docker compose -f ./docker-compose.yml up -d --build # --force-recreate
    docker image prune -f
else
    # El contenedor se llama ed-expansion-api (docker-compose.yml)
    docker restart ed-expansion-api
fi

# docker logs --follow ed-colonizacion-api
# docker exec -it ed-colonizacion-api bash
