"""Экспорт примеров API. Запускается локально с TOKEN и data из login_test.py."""
import argparse
import asyncio
import importlib
import json
import re
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

SENSITIVE_KEYS = {"token", "accesstoken", "refreshtoken", "password", "authorization"}


def clean_payload(value, token):
    """Remove credential fields and the current token from exported responses."""
    if isinstance(value, dict):
        return {
            str(key): "<redacted>" if re.sub(r"[^a-z]", "", str(key).lower()) in SENSITIVE_KEYS
            else clean_payload(item, token)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [clean_payload(item, token) for item in value]
    if isinstance(value, str) and token:
        return value.replace(token, "<redacted>")
    return value


def extract_group_ids(value):
    if isinstance(value, dict):
        value = next((value[key] for key in ("eduGroups", "groups", "items")
                      if isinstance(value.get(key), list)), [])
    if not isinstance(value, list):
        return []
    result = []
    for item in value:
        if isinstance(item, dict):
            item = item.get("id_str") or item.get("id") or item.get("eduGroupId")
        if isinstance(item, (str, int)) and re.fullmatch(r"[1-9][0-9]{0,19}", str(item)):
            if str(item) not in result:
                result.append(str(item))
    return result


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


async def export_responses(diary, token, person_id, school_id, start, end, output, group_ids=()):
    output.mkdir(parents=True, exist_ok=False)
    start_time = datetime.combine(start, time.min).isoformat()
    end_time = datetime.combine(end, time.max).isoformat()
    period = {"startDate": start_time, "endDate": end_time}
    manifest = {
        "createdAt": datetime.now().astimezone().isoformat(),
        "personId": str(person_id), "schoolId": str(school_id),
        "startDate": start.isoformat(), "endDate": end.isoformat(),
        "requests": [],
    }
    report_path = output / "manifest.json"

    async def collect(name, method, params=None):
        entry = {"name": name, "method": method, "params": params or {}}
        print(f"Запрос: {name}...")
        try:
            payload = await diary.get(method, params=params)
            if isinstance(payload, dict) and (payload.get("error") or
                re.match(r"^(api|parameter|authorization|invalidToken|tokenRequired)", str(payload.get("type", "")), re.I)):
                raise ValueError("API error response")
            filename = name + ".json"
            write_json(output / filename, clean_payload(payload, token))
            entry.update(ok=True, file=filename)
            print(f"  Сохранено: {filename}")
            return payload
        except Exception as error:
            # Exception messages can contain request URLs; do not export or print them.
            entry.update(ok=False, errorType=type(error).__name__)
            status = getattr(error, "status", None)
            if isinstance(status, int):
                entry["httpStatus"] = status
            print(f"  Не получено: {entry['errorType']}" + (f" (HTTP {status})" if status else ""))
            return None
        finally:
            manifest["requests"].append(entry)
            write_json(report_path, manifest)

    await collect("profile", "users/me")
    await collect("context", "users/me/context")
    await collect("children", "users/me/children")
    await collect("school", f"schools/{school_id}")
    await collect("subjects", f"schools/{school_id}/subjects")
    groups = await collect("groups", f"persons/{person_id}/schools/{school_id}/edu-groups")
    await collect("marks", f"persons/{person_id}/schools/{school_id}/marks/{start_time}/{end_time}")
    homework = await collect("homework", f"persons/{person_id}/school/{school_id}/homeworks", period)
    await collect("timetables", f"schools/{school_id}/timetables")

    selected = list(dict.fromkeys([*map(str, group_ids), *extract_group_ids(groups)]))
    # Homework can identify subject subgroups as well as the main class.
    if isinstance(homework, dict):
        for work in homework.get("works", []):
            if isinstance(work, dict):
                for group in extract_group_ids([work.get("eduGroup_str") or work.get("eduGroup")]):
                    if group not in selected:
                        selected.append(group)
    for group in selected:
        await collect(f"schedule_{group}", f"persons/{person_id}/groups/{group}/schedules", period)
    if not selected:
        manifest["notes"] = ["Не удалось определить учебную группу. Повторите с --group-id ID_ГРУППЫ."]
        write_json(report_path, manifest)
        print(manifest["notes"][0])
    succeeded = sum(entry["ok"] for entry in manifest["requests"])
    print(f"Готово: {succeeded}/{len(manifest['requests'])} запросов. Папка: {output}")
    return manifest


def arguments():
    today = date.today()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", type=date.fromisoformat, default=today - timedelta(days=14))
    parser.add_argument("--end", type=date.fromisoformat, default=today + timedelta(days=14))
    parser.add_argument("--group-id", action="append", default=[], help="ID учебной группы, можно указать несколько раз")
    return parser.parse_args()


async def main(args):
    if args.start > args.end or (args.end - args.start).days > 31:
        print("Выберите корректный диапазон до 31 дня.")
        return 2
    if any(not re.fullmatch(r"[1-9][0-9]{0,19}", value) for value in args.group_id):
        print("--group-id должен содержать числовой ID.")
        return 2
    try:
        settings = importlib.import_module("login_test")
        token = getattr(settings, "TOKEN", "").strip()
        data = settings.data
        person_id = str(data.get("personId") or data.get("person_id") or "")
        school_id = str(data.get("schoolId") or data.get("school_id") or "")
        if not token or token == "YOUR_TOKEN":
            raise ValueError
        if any(not re.fullmatch(r"[1-9][0-9]{0,19}", value) for value in (person_id, school_id)):
            raise ValueError
    except (ImportError, AttributeError, TypeError, ValueError):
        print("Сохраните login_test.py с TOKEN и data: personId, schoolId.")
        return 2
    try:
        import aiohttp
        from pydnevnikruapi import AsyncDiaryAPI
    except ImportError:
        print("Установите зависимости: python -m pip install -r python_api/requirements.txt")
        return 2
    output = Path(__file__).resolve().parent / "data" / datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=45), raise_for_status=True) as session:
        diary = AsyncDiaryAPI(session=session, token=token)
        manifest = await export_responses(diary, token, person_id, school_id, args.start, args.end, output, args.group_id)
    return 0 if all(entry["ok"] for entry in manifest["requests"]) else 1


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main(arguments())))
    except KeyboardInterrupt:
        print("Экспорт остановлен. Уже полученные файлы сохранены.")
        sys.exit(130)
