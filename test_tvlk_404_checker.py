import importlib.util
import pathlib
import unittest


MODULE_PATH = pathlib.Path(__file__).resolve().parent / "scripts" / "tvlk" / "check_404_stealth.py"
SPEC = importlib.util.spec_from_file_location("check_404_stealth", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class EvaluateProbeTests(unittest.TestCase):
    def test_confirmed_404_deactivates_record(self):
        result = MODULE.evaluate_probe(
            "rec1",
            "https://example.com",
            "2026-03-13T00:00:00Z",
            head_status=404,
            get_status=404,
        )
        self.assertEqual(result.final_result, "confirmed_404")
        self.assertEqual(result.patch_payload["last_http_status"], 404)
        self.assertEqual(result.patch_payload["is_active"], False)
        self.assertEqual(result.patch_payload["last_checked_at"], "2026-03-13T00:00:00Z")

    def test_head_200_marks_alive(self):
        result = MODULE.evaluate_probe(
            "rec2",
            "https://example.com",
            "2026-03-13T00:00:00Z",
            head_status=200,
        )
        self.assertEqual(result.final_result, "http_200")
        self.assertEqual(result.patch_payload["last_http_status"], 200)
        self.assertEqual(result.patch_payload["last_check_error"], "")
        self.assertNotIn("is_active", result.patch_payload)

    def test_soft_404_stays_manual_review(self):
        html = "<html><head><title>404 page not found</title></head><body>page not found</body></html>"
        result = MODULE.evaluate_probe(
            "rec3",
            "https://example.com",
            "2026-03-13T00:00:00Z",
            head_status=404,
            get_status=200,
            get_body=html,
        )
        self.assertEqual(result.final_result, "soft_404")
        self.assertEqual(result.patch_payload["last_http_status"], 200)
        self.assertEqual(result.patch_payload["last_check_error"], "soft_404")
        self.assertNotIn("is_active", result.patch_payload)

    def test_timeout_clears_http_status(self):
        result = MODULE.evaluate_probe(
            "rec4",
            "https://example.com",
            "2026-03-13T00:00:00Z",
            head_status=None,
            error="timeout",
        )
        self.assertEqual(result.final_result, "timeout")
        self.assertIsNone(result.patch_payload["last_http_status"])
        self.assertEqual(result.patch_payload["last_check_error"], "timeout")


class Soft404Tests(unittest.TestCase):
    def test_soft_404_requires_multiple_signals(self):
        self.assertFalse(MODULE.looks_like_soft_404("<html><body>page not found</body></html>"))
        self.assertTrue(
            MODULE.looks_like_soft_404(
                "<html><head><title>Page Not Found</title></head><body>page not found</body></html>"
            )
        )


class RetryTests(unittest.TestCase):
    def test_timeout_error_is_classified(self):
        self.assertEqual(MODULE.classify_probe_exception(TimeoutError("timed out")), "timeout")

    def test_perform_request_retries_timeout(self):
        checker = MODULE.Tvlk404Checker(
            "http://127.0.0.1:8090",
            "token",
            timeout_retries=2,
            min_jitter=0,
            max_jitter=0,
        )
        calls = {"count": 0}

        def flaky(_url):
            calls["count"] += 1
            if calls["count"] < 3:
                raise TimeoutError("timed out")
            return "ok"

        self.assertEqual(checker._perform_request(flaky, "https://example.com"), "ok")
        self.assertEqual(calls["count"], 3)


if __name__ == "__main__":
    unittest.main()
