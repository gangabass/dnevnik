# API дневника на Ubuntu

Node.js 24, SQLite на постоянном Docker volume, существующие обработчики Worker.
Проверка оценок запускается при старте и затем каждые пять минут; запуски не
перекрываются. Без четырёх push-ключей работает только API. Фронтенд остаётся на Pages.

## Установка

Скопируйте репозиторий на сервер, например в `/home/kinjo/dnevnik`.
Далее команды выполняются из этой папки. Нужен Docker Compose v2.

```bash
cp server/.env.example server/.env
chmod 600 server/.env
nano server/.env
docker network create dnevnik-proxy
```

В `ALLOWED_ORIGINS` укажите origin GitHub Pages, например
`https://gangabass.github.io` (уточните реальный адрес, без пути репозитория).
Несколько origin разделяются запятой. Начинаем с пустой базы и новыми ключами;
старые ключи и D1 не используются. После сборки образа создайте новые ключи:

```bash
docker compose -f server/compose.yaml build
docker compose -f server/compose.yaml run --rm --no-deps --user "$(id -u):$(id -g)" -v "$PWD/server:/settings" dnevnik-api node server/generate-secrets.mjs /settings/.env
mv server/.env.next server/.env
chmod 600 server/.env
```

Генератор сохраняет результат в соседний `.env.next`, не выводит секреты и
отказывается заменять уже настроенные push-ключи. Сохраните новые ключи приватно;
при следующих обновлениях повторная генерация не нужна.

Для постоянного подключения Proxy Manager добавьте в его существующий
`/home/kinjo/nginx-proxy-manager/docker-compose.yaml` сети, сохранив порты и volumes:

```yaml
services:
  nginx-proxy-manager:
    # существующие image, container_name, restart, ports, volumes сохраняются
    networks:
      - default
      - dnevnik-proxy
networks:
  dnevnik-proxy:
    external: true
```

Сделайте резервную копию Compose-файла перед редактированием. Подключить уже
работающий контейнер без перезапуска можно командой:

```bash
docker network connect dnevnik-proxy nginx-proxy-manager
```

Если сеть уже подключена, повторять команду не нужно. Изменение Compose сохранит
подключение при будущем пересоздании контейнера; прямо сейчас пересоздавать его не нужно.

```bash
docker compose -f server/compose.yaml build
docker compose -f server/compose.yaml up -d
docker compose -f server/compose.yaml ps
docker compose -f server/compose.yaml exec dnevnik-api node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>r.json()).then(console.log)"
```

Контейнер работает без root, порт 3001 не публикуется на хосте.

## Nginx Proxy Manager

Откройте существующий Proxy Host `gangabass.duckdns.org` → Advanced.
Сохраните уже имеющиеся директивы и добавьте следующий блок на уровне server.
Это не раскрывающийся Advanced внутри вкладки SSL.
Не создавайте одновременно Custom Location для того же пути.

```nginx
location ^~ /dnevnik-api/ {
    # Docker DNS: имя разрешается заново и после пересоздания API-контейнера.
    resolver 127.0.0.11 valid=30s ipv6=off;
    set $dnevnik_upstream http://dnevnik-api:3001;
    rewrite ^/dnevnik-api/(.*)$ /$1 break;
    proxy_pass $dnevnik_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 5s;
    proxy_read_timeout 120s;
    client_max_body_size 64k;
    proxy_cache off;
}
```

Главный маршрут Home Assistant `http://192.168.0.158:8123`, WebSockets и SSL
оставьте как есть. Проверьте публичный адрес с телефона через мобильную сеть:

```text
https://gangabass.duckdns.org/dnevnik-api/api/health
```

Ожидается JSON с `ok: true`. При 502 проверьте подключение обоих контейнеров
к `dnevnik-proxy`, состояние API и `docker exec nginx-proxy-manager nginx -t`.
Поле `service: dnevnik-worker` сохранено для совместимости, сервер уже работает в Node.

## Запуск с чистого листа

Новый Docker volume автоматически получает пустую SQLite и схему таблиц.
Существующие данные Cloudflare не импортируются и не удаляются.
Перед включением новых уведомлений отключите старый Cloudflare Cron Trigger,
чтобы старый Worker не продолжал рассылку по прежним подпискам.

После переключения Pages на Ubuntu на каждом устройстве включите фоновые
уведомления заново. Приложение сравнит VAPID-ключи и заменит старую браузерную подписку.
Первая регистрация создаст новую базу сравнения без рассылки прежних оценок.
Проверьте кнопку тестовой отправки и последнюю успешную проверку.

## Переключение GitHub Pages

Только после успешной публичной проверки API задайте в репозитории GitHub:
Settings → Secrets and variables → Actions → Variables:

```text
VITE_API_BASE_URL=https://gangabass.duckdns.org/dnevnik-api
```

Запустите workflow Deploy to GitHub Pages. Для локальной сборки задайте такое же
значение в `.env.local`. Секретный токен в переменные Vite добавлять не нужно.
Проверьте профиль, оценки, домашнее задание, CORS и push с телефона.

## Обновление и резервная копия

```bash
docker compose -f server/compose.yaml up -d --build
docker compose -f server/compose.yaml logs --tail 50
```

Для резервной копии остановите API, скопируйте `/data` из контейнера через
`docker compose -f server/compose.yaml cp dnevnik-api:/data ./private-backup`,
затем запустите его. Храните вместе с копией базы новые push-ключи приватно.
Не используйте `down -v`: это удаляет данные.

Откат: остановите новый API, верните переменную Pages на прежний адрес и
пересоберите фронтенд. После отката уведомления на устройствах потребуется переподключить под ключи
старого Worker. Только затем включайте старый Cron Trigger. При откате к workers.dev ограничения
мобильного оператора снова будут действовать.

## Локальные проверки

```bash
npm run test:server
cd worker
npm run lint
npm run test:unit
```

Справка: https://nodejs.org/docs/latest-v24.x/api/sqlite.html,
https://docs.docker.com/compose/how-tos/networking/,
https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
