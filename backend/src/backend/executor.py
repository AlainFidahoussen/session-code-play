"""Server-side sandbox for grading candidate Python solutions.

Candidate code runs in its own subprocess (not the API process), so a crash,
infinite loop, or runaway allocation can't take down the server — a hard
timeout kills it. This is process isolation via a hard timeout, not a full
container/seccomp sandbox (no network/filesystem/memory restriction); see
`docs/specs.md` §8 for the tradeoff.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

from pydantic import BaseModel

from backend.models import JSONValue, TestCase

DEFAULT_TIMEOUT_SECONDS = 5.0

_MAX_STDOUT_CHARS = 4000

_HARNESS = """\
import contextlib
import io
import json
import sys

MAX_STDOUT_CHARS = %d

candidate_path, tests_path, result_path, function_name = sys.argv[1:5]

namespace: dict = {}
try:
    with open(candidate_path) as f:
        exec(compile(f.read(), candidate_path, "exec"), namespace)
except Exception as exc:
    json.dump({"error": f"{type(exc).__name__}: {exc}"}, open(result_path, "w"))
    sys.exit(0)

func = namespace.get(function_name)
if not callable(func):
    json.dump({"error": f"Function '{function_name}' is not defined"}, open(result_path, "w"))
    sys.exit(0)

with open(tests_path) as f:
    tests = json.load(f)

results = []
for test in tests:
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            actual = func(*test["input"])
        passed = actual == test["expected"]
        outcome = {"passed": passed, "actual": actual}
    except Exception as exc:
        outcome = {"passed": False, "error": f"{type(exc).__name__}: {exc}"}
    stdout = buf.getvalue()
    if len(stdout) > MAX_STDOUT_CHARS:
        stdout = stdout[:MAX_STDOUT_CHARS] + "... (truncated)"
    outcome["stdout"] = stdout
    results.append(outcome)

json.dump({"results": results}, open(result_path, "w"))
""" % _MAX_STDOUT_CHARS


class TestOutcome(BaseModel):
    passed: bool
    actual: JSONValue = None
    error: str | None = None
    stdout: str = ""


class ExecutionError(Exception):
    """Candidate code failed to produce per-test results at all — a syntax
    error, a missing/uncallable function, or a timeout — as opposed to an
    individual test case failing."""


def run_tests(
    code: str,
    function_name: str,
    tests: list[TestCase],
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
) -> list[TestOutcome]:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        candidate_path = tmp_path / "candidate.py"
        harness_path = tmp_path / "harness.py"
        tests_path = tmp_path / "tests.json"
        result_path = tmp_path / "result.json"

        candidate_path.write_text(code)
        harness_path.write_text(_HARNESS)
        tests_path.write_text(json.dumps([t.model_dump() for t in tests]))

        try:
            proc = subprocess.run(
                [
                    sys.executable,
                    str(harness_path),
                    str(candidate_path),
                    str(tests_path),
                    str(result_path),
                    function_name,
                ],
                timeout=timeout_seconds,
                capture_output=True,
                text=True,
            )
        except subprocess.TimeoutExpired as exc:
            raise ExecutionError(f"Execution timed out after {timeout_seconds:.0f}s") from exc

        if not result_path.exists():
            raise ExecutionError(proc.stderr.strip() or "Execution failed with no output")

        payload = json.loads(result_path.read_text())

    if "error" in payload:
        raise ExecutionError(payload["error"])

    return [TestOutcome(**r) for r in payload["results"]]
