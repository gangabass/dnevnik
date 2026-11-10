import asyncio
import contextlib
import io
import json
import tempfile
import unittest
from datetime import date
from pathlib import Path

from export_api import clean_payload, export_responses, extract_group_ids


class ExportTests(unittest.TestCase):
    def test_removes_credentials_recursively_and_preserves_integer_ids(self):
        token = "synthetic-private-token"
        cleaned = clean_payload({
            "Access_Token": token,
            "nested": [{"refresh_token": "another-secret", "text": "link?token=" + token}],
            "id": 2555795349104931316,
        }, token)
        serialized = json.dumps(cleaned)
        self.assertNotIn(token, serialized)
        self.assertNotIn("another-secret", serialized)
        self.assertEqual(cleaned["id"], 2555795349104931316)

    def test_group_response_shapes(self):
        self.assertEqual(extract_group_ids({"groups": [{"id_str": "2519382332901597278"}]}), ["2519382332901597278"])
        self.assertEqual(extract_group_ids([123, {"id": 456}, 123, None]), ["123", "456"])
        self.assertEqual(extract_group_ids({"unknown": True}), [])

    def test_partial_export_and_schedule_discovery(self):
        class Forbidden(Exception):
            status = 403

        class FakeDiary:
            def __init__(self):
                self.calls = []

            async def get(self, method, params=None):
                self.calls.append((method, params))
                if method == "users/me/context":
                    raise Forbidden("synthetic-private-token")
                if method.endswith("edu-groups"):
                    return [{"id_str": "2519382332901597278"}]
                if method.endswith("homeworks"):
                    return {"works": [{"eduGroup_str": "2519382332901597279"}]}
                return {"id": 2555795349104931316, "access_token": "synthetic-private-token"}

        diary = FakeDiary()
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "export"
            console = io.StringIO()
            with contextlib.redirect_stdout(console):
                manifest = asyncio.run(export_responses(
                    diary, "synthetic-private-token", "111", "222",
                    date(2026, 11, 1), date(2026, 11, 20), output,
                ))
            self.assertEqual(len(manifest["requests"]), 11)
            failed = [entry for entry in manifest["requests"] if not entry["ok"]]
            self.assertEqual(failed[0]["name"], "context")
            self.assertEqual(failed[0]["httpStatus"], 403)
            self.assertFalse((output / "context.json").exists())
            self.assertTrue((output / "marks.json").exists())
            self.assertTrue((output / "schedule_2519382332901597279.json").exists())
            schedule_calls = [(method, params) for method, params in diary.calls if method.endswith("schedules")]
            self.assertEqual(len(schedule_calls), 2)
            self.assertEqual(schedule_calls[0][1]["endDate"], "2026-11-20T23:59:59.999999")
            self.assertTrue(any(method.startswith("persons/111/schools/222/marks/") for method, _ in diary.calls))
            for file in output.glob("*.json"):
                text = file.read_text(encoding="utf-8")
                json.loads(text)
                self.assertNotIn("synthetic-private-token", text)
            self.assertNotIn("synthetic-private-token", console.getvalue())


if __name__ == "__main__":
    unittest.main()
