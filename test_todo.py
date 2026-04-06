"""TODO List CLI 测试用例。"""

import json
import uuid

import pytest

import todo


@pytest.fixture
def tmp_storage(monkeypatch, tmp_path):
    """将 STORAGE_FILE 指向临时文件，实现测试隔离。"""
    storage = tmp_path / ".todo.json"
    monkeypatch.setattr(todo, "STORAGE_FILE", storage)
    return storage


def read_payload(path):
    with open(path, encoding="utf-8") as file_obj:
        return json.load(file_obj)


def read_tasks(path):
    return read_payload(path)["tasks"]


class TestAdd:
    """测试 add 命令。"""

    def test_add_uses_document_defaults(self, tmp_storage, capsys):
        args = todo.argparse.Namespace(title="买牛奶", priority="medium", category="personal")
        todo.cmd_add(args)

        payload = read_payload(tmp_storage)
        assert list(payload.keys()) == ["tasks"]
        assert len(payload["tasks"]) == 1

        task = payload["tasks"][0]
        uuid.UUID(task["id"])
        assert task["title"] == "买牛奶"
        assert task["priority"] == "medium"
        assert task["category"] == "personal"
        assert task["done"] is False
        assert "created_at" in task

        captured = capsys.readouterr()
        assert "已添加任务" in captured.out
        assert "买牛奶" in captured.out

    def test_add_with_priority_and_category(self, tmp_storage):
        args = todo.argparse.Namespace(title="买菜", priority="high", category="shopping")
        todo.cmd_add(args)

        task = read_tasks(tmp_storage)[0]
        assert task["priority"] == "high"
        assert task["category"] == "shopping"

    def test_add_blank_title_fails(self, tmp_storage, capsys):
        args = todo.argparse.Namespace(title="   ", priority="medium", category="personal")

        with pytest.raises(SystemExit) as exc_info:
            todo.cmd_add(args)

        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "任务标题不能为空" in captured.err
        assert not tmp_storage.exists()


class TestList:
    """测试 list 命令。"""

    def test_list_empty(self, tmp_storage, capsys):
        args = todo.argparse.Namespace(priority=None, category=None, all=False)
        todo.cmd_list(args)

        captured = capsys.readouterr()
        assert "没有找到任务" in captured.out

    def test_list_hides_completed_by_default(self, tmp_storage, capsys):
        todo.cmd_add(todo.argparse.Namespace(title="待完成任务", priority="medium", category="personal"))
        task_id = read_tasks(tmp_storage)[0]["id"]
        capsys.readouterr()

        todo.cmd_done(todo.argparse.Namespace(task_id=task_id))
        capsys.readouterr()

        todo.cmd_list(todo.argparse.Namespace(priority=None, category=None, all=False))
        captured = capsys.readouterr()
        assert "没有找到任务" in captured.out

    def test_list_all_shows_pending_and_completed(self, tmp_storage, capsys):
        todo.cmd_add(todo.argparse.Namespace(title="未完成", priority="low", category="personal"))
        first_id = read_tasks(tmp_storage)[0]["id"]
        capsys.readouterr()

        todo.cmd_add(todo.argparse.Namespace(title="已完成", priority="high", category="work"))
        second_id = read_tasks(tmp_storage)[1]["id"]
        capsys.readouterr()

        todo.cmd_done(todo.argparse.Namespace(task_id=second_id))
        capsys.readouterr()

        todo.cmd_list(todo.argparse.Namespace(priority=None, category=None, all=True))
        captured = capsys.readouterr()

        assert first_id in captured.out
        assert second_id in captured.out
        assert "未完成" in captured.out
        assert "已完成" in captured.out
        assert "[ ]" in captured.out
        assert "[x]" in captured.out

    def test_list_filter_by_category(self, tmp_storage, capsys):
        todo.cmd_add(todo.argparse.Namespace(title="写周报", priority="medium", category="work"))
        capsys.readouterr()
        todo.cmd_add(todo.argparse.Namespace(title="买水果", priority="medium", category="shopping"))
        capsys.readouterr()

        todo.cmd_list(todo.argparse.Namespace(priority=None, category="work", all=True))
        captured = capsys.readouterr()

        assert "写周报" in captured.out
        assert "买水果" not in captured.out

    def test_list_filter_by_priority(self, tmp_storage, capsys):
        todo.cmd_add(todo.argparse.Namespace(title="普通任务", priority="medium", category="personal"))
        capsys.readouterr()
        todo.cmd_add(todo.argparse.Namespace(title="紧急任务", priority="high", category="work"))
        capsys.readouterr()

        todo.cmd_list(todo.argparse.Namespace(priority="high", category=None, all=True))
        captured = capsys.readouterr()

        assert "紧急任务" in captured.out
        assert "普通任务" not in captured.out


class TestDone:
    """测试 done 命令。"""

    def test_done_marks_task_complete(self, tmp_storage, capsys):
        todo.cmd_add(todo.argparse.Namespace(title="买面包", priority="medium", category="shopping"))
        task_id = read_tasks(tmp_storage)[0]["id"]
        capsys.readouterr()

        todo.cmd_done(todo.argparse.Namespace(task_id=task_id))

        task = read_tasks(tmp_storage)[0]
        assert task["done"] is True

        captured = capsys.readouterr()
        assert "已完成任务" in captured.out
        assert "买面包" in captured.out

    def test_done_nonexistent_id_fails(self, tmp_storage, capsys):
        with pytest.raises(SystemExit) as exc_info:
            todo.cmd_done(todo.argparse.Namespace(task_id="missing-id"))

        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "不存在" in captured.err


class TestRemove:
    """测试 remove 命令。"""

    def test_remove_deletes_task(self, tmp_storage, capsys):
        todo.cmd_add(todo.argparse.Namespace(title="临时任务", priority="medium", category="personal"))
        task_id = read_tasks(tmp_storage)[0]["id"]
        capsys.readouterr()

        todo.cmd_remove(todo.argparse.Namespace(task_id=task_id))

        assert read_tasks(tmp_storage) == []
        captured = capsys.readouterr()
        assert "已删除任务" in captured.out
        assert "临时任务" in captured.out

    def test_remove_nonexistent_id_fails(self, tmp_storage, capsys):
        with pytest.raises(SystemExit) as exc_info:
            todo.cmd_remove(todo.argparse.Namespace(task_id="missing-id"))

        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "不存在" in captured.err


class TestStorage:
    """测试存储和兼容性。"""

    def test_corrupted_json_file_is_backed_up(self, tmp_storage, capsys):
        tmp_storage.write_text("{ broken json", encoding="utf-8")

        tasks = todo.load_tasks()

        assert tasks == []
        assert tmp_storage.with_suffix(".json.bak").exists()
        captured = capsys.readouterr()
        assert "任务文件格式损坏" in captured.err

    def test_invalid_structure_is_backed_up(self, tmp_storage, capsys):
        tmp_storage.write_text(json.dumps({"tasks": "not-a-list"}), encoding="utf-8")

        tasks = todo.load_tasks()

        assert tasks == []
        assert tmp_storage.with_suffix(".json.bak").exists()
        captured = capsys.readouterr()
        assert "任务文件结构无效" in captured.err

    def test_legacy_list_format_is_migrated_on_next_save(self, tmp_storage):
        legacy_payload = [
            {
                "id": 1,
                "content": "旧任务",
                "priority": "normal",
                "category": "general",
                "done": False,
                "created_at": "2026-03-27T10:00:00",
            }
        ]
        tmp_storage.write_text(json.dumps(legacy_payload, ensure_ascii=False), encoding="utf-8")

        todo.cmd_add(todo.argparse.Namespace(title="新任务", priority="high", category="work"))

        payload = read_payload(tmp_storage)
        assert list(payload.keys()) == ["tasks"]
        assert len(payload["tasks"]) == 2
        assert payload["tasks"][0]["title"] == "旧任务"
        assert payload["tasks"][0]["priority"] == "medium"
        assert payload["tasks"][0]["category"] == "personal"


class TestParserAndIntegration:
    """测试解析器和完整流程。"""

    def test_parser_supports_architecture_flags(self):
        parser = todo.build_parser()

        add_args = parser.parse_args(["add", "写报告", "-p", "high", "-c", "work"])
        list_args = parser.parse_args(["list", "--all", "--priority", "high", "--category", "work"])

        assert add_args.command == "add"
        assert add_args.priority == "high"
        assert add_args.category == "work"
        assert list_args.command == "list"
        assert list_args.all is True
        assert list_args.priority == "high"
        assert list_args.category == "work"

    def test_full_workflow_matches_target_features(self, tmp_storage):
        todo.main(["add", "买牛奶", "--priority", "high", "--category", "shopping"])
        tasks = read_tasks(tmp_storage)
        assert len(tasks) == 1

        task_id = tasks[0]["id"]
        todo.main(["done", task_id])
        assert read_tasks(tmp_storage)[0]["done"] is True

        todo.main(["remove", task_id])
        assert read_tasks(tmp_storage) == []
