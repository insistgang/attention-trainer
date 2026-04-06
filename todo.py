#!/usr/bin/env python3
"""TODO List CLI - 简单的命令行待办事项管理器"""

import argparse
import json
import os
import shutil
import sys
import time
import uuid
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

STORAGE_FILE = Path.home() / ".todo.json"

VALID_PRIORITIES = ("high", "medium", "low")
VALID_CATEGORIES = ("work", "personal", "shopping")
MAX_TITLE_LENGTH = 1000
LOCK_TIMEOUT_SECONDS = 5.0
LOCK_RETRY_INTERVAL_SECONDS = 0.05


class StorageError(Exception):
    """任务存储相关错误。"""


def get_lock_file() -> Path:
    """返回任务文件的锁文件路径。"""
    return STORAGE_FILE.with_suffix(".json.lock")


def fail(message: str) -> None:
    """输出错误并退出。"""
    print(message, file=sys.stderr)
    sys.exit(1)


def backup_corrupted_file(reason: str) -> list[dict[str, Any]]:
    """备份损坏的任务文件并返回空任务列表。"""
    if STORAGE_FILE.exists():
        backup = STORAGE_FILE.with_suffix(".json.bak")
        try:
            shutil.copy2(STORAGE_FILE, backup)
            print(f"警告: {reason}，已备份到 {backup}", file=sys.stderr)
        except OSError as exc:
            print(
                f"警告: {reason}，备份失败: {exc}",
                file=sys.stderr,
            )
    return []


def normalize_task(task: dict[str, Any]) -> dict[str, Any]:
    """将任务对象规范化为当前数据结构。"""
    if not isinstance(task, dict):
        raise ValueError("任务项必须是对象")

    task_id = task.get("id")
    if isinstance(task_id, int) and task_id > 0:
        task_id = str(task_id)
    elif isinstance(task_id, str):
        task_id = task_id.strip()
    else:
        raise ValueError("任务 ID 无效")
    if not task_id:
        raise ValueError("任务 ID 不能为空")

    title = task.get("title", task.get("content"))
    if not isinstance(title, str):
        raise ValueError("任务标题无效")
    title = title.strip()
    if not title:
        raise ValueError("任务标题不能为空")

    priority = task.get("priority", "medium")
    if priority == "normal":
        priority = "medium"
    if priority not in VALID_PRIORITIES:
        raise ValueError("任务优先级无效")

    category = task.get("category", "personal")
    if category == "general":
        category = "personal"
    if category not in VALID_CATEGORIES:
        raise ValueError("任务分类无效")

    created_at = task.get("created_at")
    if not isinstance(created_at, str) or not created_at.strip():
        created_at = datetime.now().isoformat()

    return {
        "id": task_id,
        "title": title,
        "priority": priority,
        "category": category,
        "done": bool(task.get("done", False)),
        "created_at": created_at,
    }


def parse_storage_payload(data: Any) -> list[dict[str, Any]]:
    """解析并校验存储文件内容。"""
    if isinstance(data, dict):
        raw_tasks = data.get("tasks")
        if not isinstance(raw_tasks, list):
            raise ValueError("tasks 字段必须是数组")
    elif isinstance(data, list):
        # 兼容旧版直接写入 list 的格式，下一次保存时会迁移为 {"tasks": [...]}。
        raw_tasks = data
    else:
        raise ValueError("存储格式无效")

    return [normalize_task(task) for task in raw_tasks]


def load_tasks() -> list[dict[str, Any]]:
    """从 JSON 文件加载任务列表。"""
    if not STORAGE_FILE.exists():
        return []

    try:
        with open(STORAGE_FILE, "r", encoding="utf-8") as file_obj:
            payload = json.load(file_obj)
    except json.JSONDecodeError:
        return backup_corrupted_file("任务文件格式损坏")
    except OSError as exc:
        raise StorageError(f"无法读取任务文件: {exc}") from exc

    try:
        return parse_storage_payload(payload)
    except ValueError:
        return backup_corrupted_file("任务文件结构无效")


def save_tasks(tasks: list[dict[str, Any]]) -> None:
    """保存任务列表到 JSON 文件（原子写入）。"""
    STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp_file = STORAGE_FILE.with_suffix(".json.tmp")
    payload = {"tasks": tasks}

    try:
        with open(temp_file, "w", encoding="utf-8") as file_obj:
            json.dump(payload, file_obj, ensure_ascii=False, indent=2)
        temp_file.replace(STORAGE_FILE)
    except OSError as exc:
        raise StorageError(f"无法保存任务文件: {exc}") from exc


@contextmanager
def storage_lock(
    timeout: float = LOCK_TIMEOUT_SECONDS,
    retry_interval: float = LOCK_RETRY_INTERVAL_SECONDS,
):
    """使用锁文件保护读改写流程，避免并发写入时丢数据。"""
    lock_file = get_lock_file()
    lock_file.parent.mkdir(parents=True, exist_ok=True)

    started_at = time.monotonic()
    fd: int | None = None

    while True:
        try:
            fd = os.open(lock_file, os.O_CREAT | os.O_EXCL | os.O_RDWR)
            os.write(fd, str(os.getpid()).encode("utf-8"))
            break
        except FileExistsError:
            if time.monotonic() - started_at >= timeout:
                raise StorageError("无法获取任务文件锁，请稍后重试")
            time.sleep(retry_interval)
        except OSError as exc:
            raise StorageError(f"无法创建锁文件: {exc}") from exc

    try:
        yield
    finally:
        if fd is not None:
            os.close(fd)
        try:
            lock_file.unlink()
        except FileNotFoundError:
            pass
        except OSError:
            pass


def format_priority(priority: str) -> str:
    """在支持的终端中为优先级加颜色。"""
    if not sys.stdout.isatty():
        return priority

    colors = {
        "high": "\033[31m",
        "medium": "\033[33m",
        "low": "\033[32m",
    }
    reset = "\033[0m"
    return f"{colors.get(priority, '')}{priority}{reset}"


def find_task(tasks: list[dict[str, Any]], task_id: str) -> dict[str, Any] | None:
    """按任务 ID 查找任务。"""
    for task in tasks:
        if task["id"] == task_id:
            return task
    return None


def cmd_add(args: argparse.Namespace) -> None:
    """添加新任务。"""
    title = args.title.strip()
    if not title:
        fail("错误: 任务标题不能为空")
    if len(title) > MAX_TITLE_LENGTH:
        fail(f"错误: 任务标题过长（最大 {MAX_TITLE_LENGTH} 字符）")

    task = {
        "id": str(uuid.uuid4()),
        "title": title,
        "priority": args.priority,
        "category": args.category,
        "done": False,
        "created_at": datetime.now().isoformat(),
    }

    try:
        with storage_lock():
            tasks = load_tasks()
            tasks.append(task)
            save_tasks(tasks)
    except StorageError as exc:
        fail(f"错误: {exc}")

    print(f"已添加任务: {task['title']} [id: {task['id']}]")


def cmd_list(args: argparse.Namespace) -> None:
    """列出任务。"""
    try:
        tasks = load_tasks()
    except StorageError as exc:
        fail(f"错误: {exc}")

    if args.priority:
        tasks = [task for task in tasks if task["priority"] == args.priority]
    if args.category:
        tasks = [task for task in tasks if task["category"] == args.category]
    if not args.all:
        tasks = [task for task in tasks if not task["done"]]

    if not tasks:
        print("没有找到任务。")
        return

    priority_order = {"high": 0, "medium": 1, "low": 2}
    tasks.sort(
        key=lambda task: (
            priority_order.get(task["priority"], 99),
            task["created_at"],
            task["title"].lower(),
        )
    )

    print(f"{'ID':<36} {'Title':<30} {'Priority':<10} {'Category':<12} Status")
    print("-" * 100)
    for task in tasks:
        status = "[x]" if task["done"] else "[ ]"
        title = task["title"]
        if len(title) > 30:
            title = f"{title[:27]}..."
        print(
            f"{task['id']:<36} "
            f"{title:<30} "
            f"{format_priority(task['priority']):<10} "
            f"{task['category']:<12} "
            f"{status}"
        )


def cmd_done(args: argparse.Namespace) -> None:
    """标记任务为已完成。"""
    try:
        with storage_lock():
            tasks = load_tasks()
            task = find_task(tasks, args.task_id)
            if task is None:
                fail(f"错误: 任务 {args.task_id} 不存在。")
            task["done"] = True
            save_tasks(tasks)
    except StorageError as exc:
        fail(f"错误: {exc}")

    print(f"已完成任务: {task['title']}")


def cmd_remove(args: argparse.Namespace) -> None:
    """删除任务。"""
    try:
        with storage_lock():
            tasks = load_tasks()
            task = find_task(tasks, args.task_id)
            if task is None:
                fail(f"错误: 任务 {args.task_id} 不存在。")
            remaining_tasks = [item for item in tasks if item["id"] != args.task_id]
            save_tasks(remaining_tasks)
    except StorageError as exc:
        fail(f"错误: {exc}")

    print(f"已删除任务: {task['title']}")


def build_parser() -> argparse.ArgumentParser:
    """构建命令行参数解析器。"""
    parser = argparse.ArgumentParser(
        description="TODO List CLI - Simple task management",
        prog="todo.py",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    parser_add = subparsers.add_parser("add", help="添加新任务")
    parser_add.add_argument("title", help="任务标题")
    parser_add.add_argument(
        "-p",
        "--priority",
        choices=VALID_PRIORITIES,
        default="medium",
        help="优先级 (默认: medium)",
    )
    parser_add.add_argument(
        "-c",
        "--category",
        choices=VALID_CATEGORIES,
        default="personal",
        help="分类 (默认: personal)",
    )

    parser_list = subparsers.add_parser("list", help="列出任务")
    parser_list.add_argument(
        "-p",
        "--priority",
        choices=VALID_PRIORITIES,
        default=None,
        help="按优先级筛选",
    )
    parser_list.add_argument(
        "-c",
        "--category",
        choices=VALID_CATEGORIES,
        default=None,
        help="按分类筛选",
    )
    parser_list.add_argument(
        "-a",
        "--all",
        action="store_true",
        help="显示全部任务（包括已完成）",
    )

    parser_done = subparsers.add_parser("done", help="标记任务为已完成")
    parser_done.add_argument("task_id", help="任务 ID（UUID）")

    parser_remove = subparsers.add_parser("remove", help="删除任务")
    parser_remove.add_argument("task_id", help="任务 ID（UUID）")

    return parser


def main(argv: list[str] | None = None) -> None:
    """程序入口。"""
    args = build_parser().parse_args(argv)

    if args.command == "add":
        cmd_add(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "done":
        cmd_done(args)
    elif args.command == "remove":
        cmd_remove(args)


if __name__ == "__main__":
    main()
