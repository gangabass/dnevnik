# Проверка входа через pydnevnikruapi

Требуется Python 3.13+.
Из корня проекта:

```powershell
python -m pip install -r python_api/requirements.txt
python python_api/login_test.py
```

Перед запуском заполните LOGIN и PASSWORD в начале login_test.py.
Скрипт использует AsyncDiaryAPI, вызывает set_token(), затем get_info().
Успех подтверждается только после получения профиля из API.
Код выхода: 0 — успех, 1 — ошибка, 2 — не заполнены данные или отсутствует пакет.
Скрипт не выводит пароль/токен и не сохраняет cookies. login_test.py исключён из Git.

Документация библиотеки: https://github.com/kesha1225/DnevnikRuAPI
Успешность входа зависит от аккаунта и текущей поддержки авторизации библиотекой.
