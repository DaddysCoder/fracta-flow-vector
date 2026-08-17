"use client";

import { useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  category: string;
  status: string;
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [time, setTime] = useState("");
  const [category, setCategory] = useState("personal");

  async function loadTasks() {
    const res = await fetch(`/api/tasks?date=${todayISODate()}`);
    const data = await res.json();
    setTasks(data);
  }

  useEffect(() => {
    let ignore = false;
    fetch(`/api/tasks?date=${todayISODate()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setTasks(data);
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        date: date || null,
        time: time || null,
        category,
        listType: "daily",
      }),
    });

    setTitle("");
    setTime("");
    await loadTasks();
  }

  async function handleToggleDone(id: string) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "done" }),
    });
    await loadTasks();
  }

  return (
    <main>
      <h1>Tasks</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="uni">Uni</option>
          <option value="work">Work</option>
          <option value="personal">Personal</option>
        </select>
        <button type="submit">Add task</button>
      </form>

      <h2>Today&apos;s tasks</h2>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <input
              type="checkbox"
              checked={task.status === "done" || task.status === "archived"}
              onChange={() => handleToggleDone(task.id)}
            />
            {task.title}
            {task.time ? ` — ${task.time}` : ""} ({task.category})
          </li>
        ))}
      </ul>
    </main>
  );
}
