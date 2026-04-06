# TODO List CLI - Architecture Design

## 1. Project Overview

- **Project Name**: todo-cli
- **Type**: Command-line TODO list application
- **Language**: Python 3
- **Entry Point**: Single file `todo.py`
- **Data Storage**: JSON file at `~/.todo.json`

---

## 2. Data Model

```json
{
  "tasks": [
    {
      "id": "uuid-string",
      "title": "Task description",
      "priority": "high | medium | low",
      "category": "work | personal | shopping",
      "done": false,
      "created_at": "ISO-8601 timestamp"
    }
  ]
}
```

### Design Decisions
- Each task has a UUID for unique identification
- `priority` defaults to `medium` if not specified
- `category` defaults to `personal` if not specified
- `done` is a boolean flag for completion status
- `created_at` stores ISO-8601 timestamp for sorting

---

## 3. CLI Interface Design

```
usage: todo.py [-h] {add,list,done,remove} ...

TODO List CLI - Simple task management

optional arguments:
  -h, --help  show this help message and exit

subcommands:
  {add,list,done,remove}
```

### 3.1 `todo.py add <title> [--priority PRIORITY] [--category CATEGORY]`
Add a new task.

**Arguments:**
- `title` (positional, required): Task description
- `--priority`, `-p`: Priority level (high/medium/low), default: medium
- `--category`, `-c`: Category (work/personal/shopping), default: personal

**Output:** `Added: <title> [id: <uuid>]`

### 3.2 `todo.py list [--priority PRIORITY] [--category CATEGORY] [--all]`
List tasks (excludes done by default).

**Arguments:**
- `--priority`, `-p`: Filter by priority
- `--category`, `-c`: Filter by category
- `--all`, `-a`: Include completed tasks

**Output:** Tabular format with columns: ID, Title, Priority, Category, Status

### 3.3 `todo.py done <id>`
Mark a task as completed by its ID.

**Arguments:**
- `id` (positional, required): Task UUID

**Output:** `Completed: <title>`

### 3.4 `todo.py remove <id>`
Delete a task by its ID.

**Arguments:**
- `id` (positional, required): Task UUID

**Output:** `Removed: <title>`

---

## 4. Functional Specifications

### 4.1 Data Persistence
- Load tasks from `~/.todo.json` on startup (create empty if not exists)
- Write tasks to `~/.todo.json` after every mutation (add/done/remove)
- Use file locking or atomic write to prevent data corruption

### 4.2 Validation Rules
- `title` cannot be empty
- `priority` must be one of: high, medium, low
- `category` must be one of: work, personal, shopping
- `id` must exist in the task list for done/remove operations

### 4.3 Output Formatting
- List output: aligned table with status indicators (`[x]` done, `[ ]` pending)
- Priority display: colored text (red=high, yellow=medium, green=low) if terminal supports it
- Error messages: single line, clear indication of the problem

### 4.4 Error Handling
- File not found: create new empty `~/.todo.json`
- JSON parse error: backup corrupted file, start fresh
- Task not found: friendly error message with the attempted ID

---

## 5. Project Structure

```
E:/000/test1(1)/
├── ARCHITECTURE.md     # This file
└── todo.py             # Single executable file (~200-300 lines)
```

---

## 6. Internal Module Design (within todo.py)

```
argparse           # CLI argument parsing
json               # Data serialization
uuid               # Task ID generation
pathlib            # Cross-platform path handling (~/.todo.json)
datetime           # Timestamp generation
```

### Core Functions
| Function | Responsibility |
|----------|----------------|
| `load_tasks(path)` | Read and parse JSON file |
| `save_tasks(path, tasks)` | Serialize and write JSON file |
| `add_task(title, priority, category)` | Create new task, append to list, save |
| `list_tasks(filters)` | Filter and display tasks |
| `done_task(task_id)` | Mark task as done by ID |
| `remove_task(task_id)` | Delete task by ID |
| `format_priority(p)` | Format priority for display |
| `main()` | Entry point: parse args, dispatch to handlers |

---

## 7. Acceptance Criteria

- [ ] `todo.py add "Buy groceries" --priority high --category shopping` adds a task
- [ ] `todo.py list` shows only pending tasks
- [ ] `todo.py list --all` shows all tasks including completed
- [ ] `todo.py list --category work` filters by category
- [ ] `todo.py done <id>` marks task complete
- [ ] `todo.py remove <id>` deletes task
- [ ] Tasks persist across application restarts
- [ ] Invalid inputs produce helpful error messages
