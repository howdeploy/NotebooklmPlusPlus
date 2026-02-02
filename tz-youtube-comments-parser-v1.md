# ТЗ: Парсинг комментариев YouTube → NotebookLM (v1)

> **⚠️ УСТАРЕЛО:** Это ТЗ описывает первоначальный дизайн на базе YouTube Data API v3 + API-ключ. Реализация была переведена на InnerTube API — API-ключ больше не нужен, метаданные извлекаются из DOM. Актуальное описание архитектуры — в `RESUME_CONTEXT.md`.

## Обзор

Новая фича для Chrome-расширения **Add to NotebookLM** (`github.com/AndyShaman/add_to_NotebookLM`).

Пользователь находится на странице YouTube-видео → нажимает кнопку в расширении → расширение собирает ВСЕ комментарии через YouTube Data API v3 → формирует компактный MD-файл → отправляет его в выбранный ноутбук NotebookLM (через существующий механизм расширения).

Вся аналитика — на стороне LLM (NotebookLM). Задача расширения — только собрать и структурировать данные.

### Пользователи
- Маркетологи и аналитики (инсайты из комментариев, темы для контента, боли аудитории)
- Авторы YouTube-каналов (обратная связь, идеи для новых видео)
- Люди с разным техническим уровнем

### Языки интерфейса
Русский и английский (как в текущем расширении, через `_locales/`)

---

## Пользовательский сценарий

```
1. Пользователь один раз вводит YouTube API-ключ в настройках расширения
2. Открывает любое YouTube-видео
3. Нажимает иконку расширения
4. Выбирает ноутбук NotebookLM (существующий механизм)
5. Нажимает кнопку "Спарсить комментарии"
6. Видит прогресс-бар: "Загружено 1,200 / 12,345 комментариев..."
7. По завершении — файл(ы) автоматически отправляются в выбранный ноутбук
8. Пользователь открывает NotebookLM и задаёт вопросы по комментариям
```

---

## Что НЕ входит в v1

- Дашборд / графики / визуализация
- Анализ тональности / AI-анализ внутри расширения
- Парсинг нескольких видео одновременно
- Веб-приложение / Telegram-бот
- OAuth-авторизация (только API-ключ)
- CSV-экспорт

---

## Архитектура

### Существующее расширение
- **Тип:** Chrome Extension, Manifest V3
- **Структура:** `popup/`, `content/`, `app/`, `lib/`, `background.js`, `_locales/` (ru, en)
- **Что умеет:** добавление страниц/видео/плейлистов в NotebookLM, массовый импорт, удаление источников
- **Ключевое:** расширение уже имеет механизм отправки контента в выбранный ноутбук — новая фича ОБЯЗАНА использовать тот же механизм

### Новые/изменённые файлы

```
├── lib/
│   ├── youtube-comments-api.js    # Работа с YouTube Data API v3
│   └── comments-to-md.js          # Конвертация комментариев в компактный MD
├── popup/
│   ├── popup.html                 # Новая кнопка + секция настроек API-ключа
│   └── popup.js                   # Логика кнопки + прогресс-бар
├── _locales/
│   ├── ru/messages.json           # Новые строки
│   └── en/messages.json           # Новые строки
├── manifest.json                  # Добавить permission: googleapis.com
└── background.js                  # Обработчик (если нужен для API-запросов)
```

### Поток данных

```
[YouTube-страница] → content script извлекает video ID из URL
        ↓
[popup.js] → пользователь нажимает "Спарсить комментарии"
        ↓
[youtube-comments-api.js] → серия GET-запросов к YouTube Data API v3:
   1. videos.list → метаданные видео
   2. commentThreads.list → комментарии верхнего уровня (пагинация до конца)
   3. comments.list → ответы, если replies > 5 (пагинация до конца)
        ↓
[comments-to-md.js] → формирование MD-файла (или нескольких, если >450K слов)
        ↓
[Существующий механизм расширения] → отправка MD-файла(ов) в выбранный ноутбук NotebookLM
```

---

## YouTube API-ключ

### Хранение
- `chrome.storage.local` — ключ НИКОГДА не уходит на внешний сервер
- Хранится только локально в браузере пользователя

### UI
- Раздел "Настройки" (⚙️) в popup расширения
- Поле ввода с маской (показывать только последние 4 символа)
- Кнопка "Сохранить"
- Ссылка "Как получить API-ключ?" → `https://console.cloud.google.com/apis/credentials` (или короткая инструкция)

### Валидация
- При сохранении — тестовый запрос к API (например, videos.list для любого публичного видео)
- Если ключ невалидный → ошибка: "Неверный API-ключ. Проверьте ключ и убедитесь, что YouTube Data API v3 включён в Google Cloud Console."

---

## YouTube Data API v3 — детали

### 1. Метаданные видео

```
GET https://www.googleapis.com/youtube/v3/videos
  ?part=snippet,statistics
  &id={VIDEO_ID}
  &key={API_KEY}
```

Извлекаем:
- `snippet.title` — название видео
- `snippet.channelTitle` — название канала
- `snippet.publishedAt` — дата публикации
- `statistics.viewCount` — просмотры
- `statistics.likeCount` — лайки видео
- `statistics.commentCount` — общее количество комментариев

Стоимость: 1 единица квоты.

### 2. Комментарии верхнего уровня

```
GET https://www.googleapis.com/youtube/v3/commentThreads
  ?part=snippet,replies
  &videoId={VIDEO_ID}
  &maxResults=100
  &order=relevance
  &pageToken={NEXT_PAGE_TOKEN}
  &key={API_KEY}
```

Из каждого `item` извлекаем:
- `snippet.topLevelComment.snippet.textOriginal` — текст (plain text, НЕ textDisplay с HTML)
- `snippet.topLevelComment.snippet.authorDisplayName` — автор
- `snippet.topLevelComment.snippet.likeCount` — лайки
- `snippet.topLevelComment.snippet.publishedAt` — дата
- `snippet.totalReplyCount` — количество ответов
- `replies.comments[]` — до 5 ответов (inline, уже в ответе)

Пагинация: повторять запросы с `nextPageToken` пока он не станет `undefined`. Лимита нет — забираем ВСЕ комментарии.

Стоимость: 1 единица / 100 комментариев.

### 3. Ответы (replies), если больше 5

```
GET https://www.googleapis.com/youtube/v3/comments
  ?part=snippet
  &parentId={COMMENT_ID}
  &maxResults=100
  &pageToken={NEXT_PAGE_TOKEN}
  &key={API_KEY}
```

Вызывать ТОЛЬКО если `snippet.totalReplyCount > 5` (commentThreads уже возвращает до 5 replies inline).

Стоимость: 1 единица / 100 ответов.

### Извлечение video ID из URL

Поддерживаемые форматы:
```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/embed/VIDEO_ID
https://youtube.com/shorts/VIDEO_ID
https://www.youtube.com/live/VIDEO_ID
```

Регулярное выражение:
```javascript
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
```

---

## Формат выходного MD-файла

### Принцип: максимальная компактность для LLM

Каждый лишний символ × тысячи комментариев = потраченные слова. Формат оптимизирован для анализа в NotebookLM, а не для человеческого чтения.

Что убрано ради экономии:
- Markdown-заголовки (###) на каждый комментарий
- Разделители (---)
- Bold-маркеры (**)
- Нумерация комментариев
- Лишние пробелы и форматирование

### Имя файла

```
comments_{VIDEO_ID}_{YYYY-MM-DD}.md
```
Если файлов несколько (разбивка по лимиту):
```
comments_{VIDEO_ID}_{YYYY-MM-DD}_part1.md
comments_{VIDEO_ID}_{YYYY-MM-DD}_part2.md
comments_{VIDEO_ID}_{YYYY-MM-DD}_part3.md
```

### Структура файла

```
# Комментарии: {Название видео}
Канал: {channelTitle} | Опубликовано: {ДД.ММ.ГГГГ} | Просмотры: {viewCount} | Лайки: {likeCount} | Комментариев: {commentCount}
https://youtube.com/watch?v={VIDEO_ID}
Спарсено: {фактическое кол-во} | Ответов: {кол-во replies} | Авторов: {уникальных} | Парсинг: {ДД.ММ.ГГГГ ЧЧ:ММ}

===

UserName | 👍523 | 15.01.2024
Это лучшее видео на эту тему! Особенно понравилась часть про маркетинг.

  ↳ AuthorReply | 👍12 | 15.01.2024
  Спасибо! Планирую продолжение на эту тему.

  ↳ AnotherUser | 👍3 | 16.01.2024
  А когда выйдет продолжение?

UserName2 | 👍201 | 16.01.2024
А можете сделать видео про аналитику конкурентов? Очень не хватает.

UserName3 | 👍89 | 17.01.2024
Не согласен с тезисом на 5:30, вот почему...

  ↳ UserName4 | 👍5 | 17.01.2024
  Согласен, тут спорный момент.
```

### Правила форматирования

1. **Текст:** использовать `textOriginal` (plain text), НЕ `textDisplay` (HTML с тегами)
2. **Дата:** только ДД.ММ.ГГГГ (без времени — экономия слов, для большинства аналитик время не нужно)
3. **Лайки:** формат `👍N` (компактно, однозначно)
4. **Ответы (replies):** с отступом 2 пробела и маркером `↳`
5. **Разделитель между комментариями:** одна пустая строка
6. **Разделитель шапки от комментариев:** `===`
7. **Числа:** с разделителями тысяч для удобства (1,234,567)
8. **Если у комментария 0 лайков:** всё равно показываем `👍0`
9. **Удаленные/скрытые комментарии:** пропускаем (API не возвращает)
10. **HTML-сущности в тексте:** декодировать (`&amp;` → `&`, `&#39;` → `'` и т.д.)

### Шапка для файлов-частей (part2, part3...)

Если файл разбивается на части, каждая часть содержит мини-шапку:

```
# Комментарии: {Название видео} (часть 2 из 3)
https://youtube.com/watch?v={VIDEO_ID}
Комментарии с {N+1} по {M} из {total}

===

(далее комментарии)
```

---

## Разбивка на файлы (лимит NotebookLM)

### Лимит
- Максимум **450 000 слов** на один источник в NotebookLM
- Используем безопасный порог: **400 000 слов** (запас 10%)

### Алгоритм подсчёта

```javascript
function countWords(text) {
  return text.trim().split(/\s+/).length;
}
```

### Логика разбивки

```
1. Формируем шапку файла → считаем слова шапки
2. Добавляем комментарии по одному (с replies)
3. После каждого комментария проверяем: wordCount > 400_000?
   - Нет → продолжаем
   - Да → закрываем текущий файл, открываем следующий (с мини-шапкой)
4. Комментарий + все его replies — неразрывный блок (не разбиваем thread между файлами)
```

### Важно
- Один комментарий с replies — это неделимый блок. Не разбиваем середину ветки между файлами.
- Каждый файл — самодостаточный (имеет шапку с названием видео и ссылкой).
- Файлы отправляются в NotebookLM последовательно.

---

## UI расширения

### Новые элементы в popup

#### 1. Кнопка "Спарсить комментарии"
- Расположение: рядом с существующими кнопками (Добавить видео, Добавить плейлист и т.д.)
- Иконка: 💬 или аналогичная
- Видна ТОЛЬКО на YouTube-страницах с видео
- Неактивна если API-ключ не введён (с подсказкой "Сначала введите API-ключ в настройках")

#### 2. Прогресс-бар
После нажатия кнопки — вместо кнопки появляется:
```
💬 Загрузка комментариев...
████████░░░░░░ 8,400 / 12,345
```
- Обновляется в реальном времени
- Общее количество берём из `statistics.commentCount` видео (запрос videos.list)
- Текущее — по мере загрузки
- Показывать процент: `68%`

#### 3. Состояние завершения
```
✅ Готово! 12,340 комментариев → 1 файл отправлен в "Мой ноутбук"
```
Или при разбивке:
```
✅ Готово! 48,231 комментариев → 3 файла отправлены в "Мой ноутбук"
```

#### 4. Настройки API-ключа
В разделе настроек расширения (⚙️):
```
YouTube API ключ: [••••••••••••abc1] [✏️]
Статус: ✅ Ключ валидный
[Как получить ключ?]
```

### Ошибки (UI-сообщения)

| Ситуация | Сообщение (RU) | Сообщение (EN) |
|----------|----------------|----------------|
| Нет API-ключа | Введите YouTube API ключ в настройках расширения | Enter YouTube API key in extension settings |
| Невалидный ключ | Неверный API-ключ. Проверьте ключ и включите YouTube Data API v3 | Invalid API key. Check your key and enable YouTube Data API v3 |
| Квота исчерпана | Дневной лимит API исчерпан. Обновится в полночь (Pacific Time) | Daily API quota exceeded. Resets at midnight Pacific Time |
| Комментарии отключены | Комментарии для этого видео отключены | Comments are disabled for this video |
| Не YouTube-страница | Откройте YouTube-видео для парсинга комментариев | Open a YouTube video to parse comments |
| Сетевая ошибка | Ошибка сети. Проверьте подключение и попробуйте снова | Network error. Check connection and try again |
| Видео не найдено | Видео не найдено. Проверьте ссылку | Video not found. Check the URL |

---

## Обработка ошибок (техническая)

### HTTP-ответы YouTube API

| HTTP код | Причина | Действие |
|----------|---------|----------|
| 200 | Успех | Продолжаем |
| 400 | Неверный запрос | Показать ошибку "Неверный API-ключ или ID видео" |
| 403, reason: `quotaExceeded` | Квота исчерпана | Показать ошибку про квоту |
| 403, reason: `forbidden` | Комментарии отключены / видео приватное | Показать соответствующую ошибку |
| 403, reason: `commentsDisabled` | Комментарии отключены | "Комментарии отключены" |
| 404 | Видео не найдено | "Видео не найдено" |
| 429 | Rate limit | Подождать 5 секунд, повторить (до 3 попыток) |
| 500/503 | Серверная ошибка YouTube | Подождать 5 секунд, повторить (до 3 попыток) |

### Rate limiting
- Между запросами — пауза 100ms (чтобы не триггерить rate limit)
- При 429 — exponential backoff: 5s, 10s, 20s, потом ошибка

### Прерывание
- Пользователь может нажать кнопку "Отмена" во время парсинга
- При отмене — предложить скачать то, что уже загружено: "Загружено 5,200 из 12,345 комментариев. Отправить загруженные в NotebookLM?"

---

## Permissions (manifest.json)

Добавить в существующий `manifest.json`:

```json
{
  "host_permissions": [
    "https://www.googleapis.com/*"
  ]
}
```

Убедиться, что `https://www.youtube.com/*` уже есть (должно быть, расширение работает с YouTube).

---

## Локализация (_locales)

### Новые ключи

```json
// _locales/ru/messages.json
{
  "parseComments": { "message": "Спарсить комментарии" },
  "parseCommentsTooltip": { "message": "Загрузить все комментарии и отправить в NotebookLM" },
  "loadingComments": { "message": "Загрузка комментариев..." },
  "commentsLoaded": { "message": "$COUNT$ комментариев загружено", "placeholders": { "COUNT": { "content": "$1" } } },
  "commentsSent": { "message": "✅ $COUNT$ комментариев → $FILES$ отправлено в \"$NOTEBOOK$\"", "placeholders": { "COUNT": { "content": "$1" }, "FILES": { "content": "$2" }, "NOTEBOOK": { "content": "$3" } } },
  "commentsDisabled": { "message": "Комментарии для этого видео отключены" },
  "apiKeyMissing": { "message": "Введите YouTube API ключ в настройках расширения" },
  "apiKeyInvalid": { "message": "Неверный API-ключ. Проверьте ключ и включите YouTube Data API v3" },
  "apiQuotaExceeded": { "message": "Дневной лимит API исчерпан. Обновится в полночь (Pacific Time)" },
  "apiKeyLabel": { "message": "YouTube API ключ" },
  "apiKeyHowTo": { "message": "Как получить ключ?" },
  "apiKeyValid": { "message": "✅ Ключ валидный" },
  "apiKeySave": { "message": "Сохранить" },
  "cancelParsing": { "message": "Отмена" },
  "cancelConfirm": { "message": "Загружено $COUNT$. Отправить загруженные в NotebookLM?", "placeholders": { "COUNT": { "content": "$1" } } },
  "filesPart": { "message": "$N$ файл", "placeholders": { "N": { "content": "$1" } } },
  "filesPartPlural": { "message": "$N$ файла", "placeholders": { "N": { "content": "$1" } } },
  "networkError": { "message": "Ошибка сети. Проверьте подключение и попробуйте снова" },
  "videoNotFound": { "message": "Видео не найдено. Проверьте ссылку" },
  "notYoutubePage": { "message": "Откройте YouTube-видео для парсинга комментариев" }
}
```

```json
// _locales/en/messages.json
{
  "parseComments": { "message": "Parse comments" },
  "parseCommentsTooltip": { "message": "Download all comments and send to NotebookLM" },
  "loadingComments": { "message": "Loading comments..." },
  "commentsLoaded": { "message": "$COUNT$ comments loaded", "placeholders": { "COUNT": { "content": "$1" } } },
  "commentsSent": { "message": "✅ $COUNT$ comments → $FILES$ sent to \"$NOTEBOOK$\"", "placeholders": { "COUNT": { "content": "$1" }, "FILES": { "content": "$2" }, "NOTEBOOK": { "content": "$3" } } },
  "commentsDisabled": { "message": "Comments are disabled for this video" },
  "apiKeyMissing": { "message": "Enter YouTube API key in extension settings" },
  "apiKeyInvalid": { "message": "Invalid API key. Check your key and enable YouTube Data API v3" },
  "apiQuotaExceeded": { "message": "Daily API quota exceeded. Resets at midnight Pacific Time" },
  "apiKeyLabel": { "message": "YouTube API key" },
  "apiKeyHowTo": { "message": "How to get a key?" },
  "apiKeyValid": { "message": "✅ Key is valid" },
  "apiKeySave": { "message": "Save" },
  "cancelParsing": { "message": "Cancel" },
  "cancelConfirm": { "message": "$COUNT$ loaded. Send loaded comments to NotebookLM?", "placeholders": { "COUNT": { "content": "$1" } } },
  "filesPart": { "message": "$N$ file", "placeholders": { "N": { "content": "$1" } } },
  "filesPartPlural": { "message": "$N$ files", "placeholders": { "N": { "content": "$1" } } },
  "networkError": { "message": "Network error. Check connection and try again" },
  "videoNotFound": { "message": "Video not found. Check the URL" },
  "notYoutubePage": { "message": "Open a YouTube video to parse comments" }
}
```

---

## Квота и производительность

### Расход квоты

| Видео | Комментариев | Запросов API | Единиц квоты | % от дневной квоты (10K) |
|-------|-------------|--------------|--------------|--------------------------|
| Малое | 500 | ~6 | ~6 | 0.06% |
| Среднее | 5,000 | ~51 | ~51 | 0.5% |
| Большое | 50,000 | ~501 | ~501 | 5% |

### Скорость
- 100ms между запросами → ~10 запросов/сек
- 50,000 комментариев ≈ 50 секунд (без учёта дополнительных запросов на replies)
- С replies: может быть 1.5-2x дольше

### Разбивка на файлы
- Безопасный лимит: 400,000 слов на файл
- Средний комментарий: ~21 слово (в компактном формате с метаданными)
- ~19,000 комментариев на файл
- 50K комментариев → 2-3 файла

---

## Чеклист готовности к релизу

- [ ] API-ключ сохраняется в `chrome.storage.local`
- [ ] API-ключ валидируется при сохранении
- [ ] API-ключ НЕ отправляется никуда кроме googleapis.com
- [ ] Video ID корректно извлекается из всех форматов YouTube URL
- [ ] commentThreads загружает ВСЕ страницы (пагинация до конца)
- [ ] replies загружаются для комментариев с >5 ответами
- [ ] MD-файл соответствует компактному формату из ТЗ
- [ ] Разбивка на файлы работает при >400K слов
- [ ] Каждый файл-часть имеет мини-шапку
- [ ] Thread (комментарий + replies) не разбивается между файлами
- [ ] Прогресс-бар обновляется в реальном времени
- [ ] Кнопка "Отмена" работает
- [ ] При отмене предлагается отправить уже загруженное
- [ ] Все ошибки API обрабатываются и показываются пользователю
- [ ] Rate limiting: пауза 100ms между запросами
- [ ] Retry с backoff при 429/500/503
- [ ] HTML-сущности в текстах декодированы
- [ ] Используется textOriginal (не textDisplay)
- [ ] Файл(ы) отправляются в NotebookLM через существующий механизм расширения
- [ ] Локализация: все строки через `_locales` (ru + en)
- [ ] Кнопка видна только на YouTube-страницах с видео
- [ ] Кнопка неактивна без API-ключа
- [ ] `host_permissions` обновлён в manifest.json
