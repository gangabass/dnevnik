# Дневник PWA + Cloudflare Worker

Приложение получает профиль и домашние задания Дневник.ру по токену пользователя.
В окне «Ввести токен» укажите токен, personId ребёнка и schoolId школы.
ID не преобразуются в JavaScript Number: большие идентификаторы сохраняются строками.

## Локальный запуск

1. Установите зависимости: `npm ci` и `npm --prefix worker ci`.
2. В `.env.local` задайте `VITE_API_BASE_URL=http://localhost:8787` (без токена).
3. В одном терминале: `npm --prefix worker run dev`.
4. Во втором: `npm run dev`, затем откройте `http://localhost:3000/dnevnik/`.
5. Нажмите «Ввести токен». Вводится ID персоны ученика, а не пользователя родителя.

В интерфейсе выберите даты (до 31 дня) и нажмите «Обновить задания».
ДЗ отображаются с предметами, учителями и ссылками на вложения.
Выполнение отмечается только на этом устройстве и не отправляется в Дневник.ру.
Лента, оценки, полное расписание и фоновые уведомления ещё не подключены.

## Хранение

Токен хранится в sessionStorage до закрытия вкладки. Worker получает его в заголовке
Authorization, передаёт в Access-Token только на api.dnevnik.ru и не сохраняет.
ID ученика/школы и последний ответ ДЗ хранятся локально для офлайн-просмотра.
Кэш разделён по ученику и школе. Кнопка выхода удаляет токен и сохранённые данные.
Сервис-воркер не кэширует API-запросы. После истечения токена введите новый.

## API Worker

- `GET /api/health` — состояние сервиса, без авторизации.
- `GET /api/profile` — профиль владельца токена (может быть родителем).
- `GET /api/homework?personId=...&schoolId=...&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` — ДЗ ученика.

Для личных данных нужен `Authorization: Bearer <token>`. Ответы имеют Cache-Control: no-store.
Worker обращается только к фиксированным методам API; произвольного прокси нет.

## Проверка и публикация

```powershell
npm run lint
npm run build
npm --prefix worker run lint
npm --prefix worker test
npm --prefix worker run test:unit
```

Команда `test` запускает Cloudflare runtime. Если локальный workerd не запускается
(на этом Windows: write EOF), `test:unit` проверяет те же обработчики и преобразование
ответов в Node с подменённым API. Это не заменяет проверку развёрнутого Worker.

При публикации сначала обновите Worker: `npm --prefix worker run deploy`.
Проверьте адрес, выданный Wrangler: имя Worker в worker/wrangler.jsonc — `worker`.
Для production-сборки задайте VITE_API_BASE_URL равным фактическому HTTPS-адресу Worker.
GitHub Pages публикует PWA из main через существующий workflow; он не развёртывает Worker.
Токен не должен попадать в .env, исходники, CI или параметры URL.
